use std::{
    collections::HashSet,
    net::{Ipv4Addr, SocketAddrV4, UdpSocket},
    thread,
    time::Duration,
};

use log::debug;
use tauri::{Emitter, Runtime, Window};

use crate::models;

static MCAST_ADDR: Ipv4Addr = Ipv4Addr::new(239, 255, 255, 250);
static MCAST_PORT: u16 = 37020;

pub fn emit_info(port: u16, config: models::DeviceConfig) {
    let socket = UdpSocket::bind("0.0.0.0:0").unwrap();
    let target = SocketAddrV4::new(MCAST_ADDR, MCAST_PORT);
    let payload = models::MulticastPayload {
        port,
        fingerprint: config.fingerprint,
    };
    let payload = serde_json::to_string(&payload).unwrap();
    debug!("sending {payload}");
    loop {
        socket.send_to(payload.as_bytes(), target).unwrap();
        thread::sleep(Duration::from_millis(500));
    }
}

pub fn recv_emitted_info<R: Runtime>(window: Window<R>, config: models::DeviceConfig) {
    let socket = UdpSocket::bind(("0.0.0.0", MCAST_PORT)).unwrap();
    socket
        .join_multicast_v4(&MCAST_ADDR, &Ipv4Addr::UNSPECIFIED)
        .unwrap();
    let mut buf = [0u8; 0x1000];
    let mut devices = HashSet::new();
    loop {
        let (amt, from) = socket.recv_from(&mut buf).unwrap();
        if let Ok(payload) = serde_json::from_slice::<models::MulticastPayload>(&buf[..amt]) {
            if payload.fingerprint == config.fingerprint {
                // Self device detected
                continue;
            }
            let server_config = models::ServerConfiguration {
                ip: from.ip().to_string(),
                port: payload.port,
            };
            devices.insert(server_config);
            let data = serde_json::to_string(&devices).unwrap();
            window.emit("device-list-updated", data).unwrap();
        };
    }
}
