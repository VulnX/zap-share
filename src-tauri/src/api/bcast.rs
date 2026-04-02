use std::{
    collections::HashSet,
    net::{Ipv4Addr, SocketAddrV4, UdpSocket},
    str::FromStr,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};

use log::{debug, info};
use tauri::{Emitter, Manager, Runtime, Window};

use crate::{api, models, server};

static BCAST_PORT: u16 = 54321;

// TODO: Doesn't work on SVKM network. Fix pls
fn detect_broadcast_target(socket: &UdpSocket) -> SocketAddrV4 {
    let ip = api::get_local_ip();
    let ip = Ipv4Addr::from_str(&ip).unwrap();
    let [a, b, c, _d] = ip.octets();
    let candidates = [
        Ipv4Addr::new(a, b, c, 255),
        Ipv4Addr::new(a, b, 255, 255),
        Ipv4Addr::new(a, 255, 255, 255),
        Ipv4Addr::new(255, 255, 255, 255),
    ];
    for addr in candidates {
        let target = SocketAddrV4::new(addr, BCAST_PORT);
        match socket.send_to(&[0u8; 1], target) {
            Ok(_) => {
                info!("using broadcast address: {addr}");
                return target;
            }
            Err(e) => {
                debug!("broadcast {addr} failed: {e}");
            }
        }
    }

    unreachable!("should have found a valid bcast candidate");
}

fn get_device_type() -> String {
    if cfg!(target_os = "android") {
        "mobile".into()
    } else {
        "computer".into()
    }
}

pub fn emit_info(config: models::DeviceConfig, shutdown: Arc<AtomicBool>) {
    let server_status_guard = server::SERVER_STATUS.read().unwrap();
    let server_status = server_status_guard.as_ref().unwrap(); // Safe
    let port = server_status.port;
    let socket = UdpSocket::bind("0.0.0.0:0").unwrap();
    socket.set_broadcast(true).unwrap();
    let payload = models::MulticastPayload {
        port,
        fingerprint: config.fingerprint,
        name: config.name,
        r#type: get_device_type(),
    };
    let payload = serde_json::to_string(&payload).unwrap();
    debug!("sending {payload}");
    let target = detect_broadcast_target(&socket);
    while !shutdown.load(Ordering::Relaxed) {
        socket.send_to(payload.as_bytes(), target).unwrap();
        thread::sleep(Duration::from_millis(500));
    }
}

pub fn recv_info<R: Runtime>(
    window: Window<R>,
    config: models::DeviceConfig,
    shutdown: Arc<AtomicBool>,
) {
    // TODO: No unwrap here pls, this CAN fail!
    let socket = UdpSocket::bind(("0.0.0.0", BCAST_PORT)).unwrap();
    let mut buf = [0u8; 0x1000]; // TODO: Can we use sizeof(models::MulticastPayload) here?
    let mut devices = HashSet::new();
    while !shutdown.load(Ordering::Relaxed) {
        socket
            .set_read_timeout(Some(Duration::from_secs(1)))
            .unwrap();
        match socket.recv_from(&mut buf) {
            Ok((amt, from)) => {
                if let Ok(payload) = serde_json::from_slice::<models::MulticastPayload>(&buf[..amt])
                {
                    if payload.fingerprint == config.fingerprint {
                        // Self device detected
                        continue;
                    }
                    let server_config = models::ServerConfiguration {
                        ip: from.ip().to_string(),
                        port: payload.port,
                        name: payload.name,
                        r#type: payload.r#type,
                    };
                    // Ensure uniqueness (by IP) in Hashset
                    devices.retain(|device: &models::ServerConfiguration| {
                        device.ip != server_config.ip
                    });
                    devices.insert(server_config);
                    let data = serde_json::to_string(&devices).unwrap();
                    window.emit("device-list-updated", data).unwrap();
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                // timeout
                continue;
            }
            Err(_) => {}
        };
    }
}

pub fn configure_bcast<R: Runtime>(window: Window<R>) {
    let transfer_mode_guard = api::TRANSFER_MODE.read().unwrap();
    let transfer_mode = transfer_mode_guard.as_ref().unwrap(); // Safe to unwrap here
    let mut bcast_thread_guard = api::BCAST_THREAD.lock().unwrap();
    // drop(bcast_thread_guard);

    // Stop current bcast sender/receiver
    if let Some(bcast_thread) = bcast_thread_guard.take() {
        bcast_thread.shutdown.store(true, Ordering::Relaxed);
        let _ = bcast_thread.handle.join();
    };

    // Start appropriate bcast handler
    let config_file_path = window.path().app_config_dir().unwrap().join("config.json");
    let config_json = std::fs::read_to_string(config_file_path).unwrap();
    let config: models::DeviceConfig = serde_json::from_str(&config_json).unwrap();
    let shutdown = Arc::new(AtomicBool::new(false));
    let shutdown_clone = shutdown.clone();
    let bcast_thread_handle = match transfer_mode {
        models::TransferMode::Send(_) => {
            thread::spawn(|| recv_info(window, config, shutdown_clone))
        }
        models::TransferMode::Receive => thread::spawn(move || emit_info(config, shutdown_clone)),
    };
    *bcast_thread_guard = Some(models::BroadcastThread {
        handle: bcast_thread_handle,
        shutdown,
    });
}
