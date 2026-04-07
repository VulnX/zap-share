use std::{
    collections::HashSet,
    net::{Ipv4Addr, SocketAddrV4, UdpSocket},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};

use log::{debug, info, warn};
use network_interface::NetworkInterfaceConfig;
use tauri::{Emitter, Manager, Runtime, Window};

use crate::{api, models, server};

static BCAST_PORT: u16 = 54321;

/// IANA-assigned "administratively scoped" multicast address (Organisation-Local).
/// Stays within the local site; routers do not forward it beyond the LAN by default.
const MULTICAST_GROUP: Ipv4Addr = Ipv4Addr::new(239, 255, 255, 250);

/// Return every IPv4 address that is not loopback, so we can join the multicast
/// group on every real interface.
fn local_ipv4_addrs() -> Vec<Ipv4Addr> {
    let mut addrs = Vec::new();
    match network_interface::NetworkInterface::show() {
        Ok(ifaces) => {
            for iface in ifaces {
                for addr in &iface.addr {
                    if let network_interface::Addr::V4(v4) = addr {
                        if !v4.ip.is_loopback() {
                            addrs.push(v4.ip);
                        }
                    }
                }
            }
        }
        Err(e) => warn!("Could not enumerate network interfaces: {e}"),
    }
    // Fall back to INADDR_ANY so we always have at least one entry.
    if addrs.is_empty() {
        addrs.push(Ipv4Addr::UNSPECIFIED);
    }
    addrs
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

    // Bind to any address / ephemeral port for sending.
    let socket = UdpSocket::bind("0.0.0.0:0").unwrap();
    debug!("UDP socket bound to ephemeral port for multicast emission");

    // Join the multicast group on every local interface so that the OS picks
    // the right source address when sending.
    for local_ip in local_ipv4_addrs() {
        match socket.join_multicast_v4(&MULTICAST_GROUP, &local_ip) {
            Ok(_) => info!("Joined multicast group {MULTICAST_GROUP} on interface {local_ip}"),
            Err(e) => warn!("Could not join multicast group on {local_ip}: {e}"),
        }
    }

    // TTL=32 – crosses switches but not Internet routers; adjust if needed.
    socket.set_multicast_ttl_v4(32).unwrap();

    let payload = models::MulticastPayload {
        port,
        fingerprint: config.fingerprint,
        name: config.name,
        r#type: get_device_type(),
    };
    let payload = serde_json::to_string(&payload).unwrap();
    debug!("Multicast payload: {payload}");

    let target = SocketAddrV4::new(MULTICAST_GROUP, BCAST_PORT);
    while !shutdown.load(Ordering::Relaxed) {
        if let Err(e) = socket.send_to(payload.as_bytes(), target) {
            warn!("Multicast send error: {e}");
        }
        thread::sleep(Duration::from_millis(500));
    }
    debug!("Multicast emission thread shutting down");
}

pub fn recv_info<R: Runtime>(
    window: Window<R>,
    config: models::DeviceConfig,
    shutdown: Arc<AtomicBool>,
) {
    debug!("Starting multicast receiver on port {}", BCAST_PORT);

    // Bind to 0.0.0.0 so we receive on all interfaces.
    let socket = UdpSocket::bind(("0.0.0.0", BCAST_PORT)).unwrap();
    info!(
        "UDP socket bound to port {} for multicast reception",
        BCAST_PORT
    );

    // Join the multicast group on every local interface.
    for local_ip in local_ipv4_addrs() {
        match socket.join_multicast_v4(&MULTICAST_GROUP, &local_ip) {
            Ok(_) => info!("Joined multicast group {MULTICAST_GROUP} on interface {local_ip}"),
            Err(e) => warn!("Could not join multicast group on {local_ip}: {e}"),
        }
    }

    let mut buf = [0u8; 0x1000];
    let mut devices = HashSet::new();

    while !shutdown.load(Ordering::Relaxed) {
        socket
            .set_read_timeout(Some(Duration::from_secs(1)))
            .unwrap();
        match socket.recv_from(&mut buf) {
            Ok((amt, from)) => {
                if let Ok(payload) = serde_json::from_slice::<models::MulticastPayload>(&buf[..amt])
                {
                    info!("Decoded multicast payload: {payload:#?}");
                    if payload.fingerprint == config.fingerprint {
                        // Our own announcement – ignore.
                        continue;
                    }
                    let server_config = models::ServerConfiguration {
                        ip: from.ip().to_string(),
                        port: payload.port,
                        name: payload.name,
                        r#type: payload.r#type,
                    };
                    // Keep set unique by IP.
                    devices.retain(|device: &models::ServerConfiguration| {
                        device.ip != server_config.ip
                    });
                    devices.insert(server_config);
                    let data = serde_json::to_string(&devices).unwrap();
                    window.emit("device-list-updated", data).unwrap();
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                // Read timeout – loop and check shutdown flag.
                continue;
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                continue;
            }
            Err(e) => {
                warn!("recv_from error: {e}");
            }
        };
    }
    debug!("Multicast receiver thread shutting down");
}

pub fn configure_bcast<R: Runtime>(window: Window<R>) {
    let transfer_mode_guard = api::TRANSFER_MODE.read().unwrap();
    let transfer_mode = transfer_mode_guard.as_ref().unwrap(); // Safe to unwrap here
    let mut bcast_thread_guard = api::BCAST_THREAD.lock().unwrap();

    // Stop current bcast sender/receiver
    if let Some(bcast_thread) = bcast_thread_guard.take() {
        bcast_thread.shutdown.store(true, Ordering::Relaxed);
        let _ = bcast_thread.handle.join();
    };

    // Start appropriate multicast handler
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
