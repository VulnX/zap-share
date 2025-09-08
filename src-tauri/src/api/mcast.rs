use std::{
    collections::HashSet,
    net::{Ipv4Addr, SocketAddrV4, UdpSocket},
    thread,
    time::Duration,
};

use log::debug;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Runtime, Window};

static MCAST_ADDR: Ipv4Addr = Ipv4Addr::new(239, 255, 255, 250);
static MCAST_PORT: u16 = 37020;

#[derive(Serialize, Deserialize)]
struct MulticastPayload {
    port: u16,
}

#[derive(Debug, Hash, PartialEq, Eq, Serialize, Deserialize)]
pub struct ServerConfiguration {
    pub ip: String,
    pub port: u16,
}

pub fn emit_info(port: u16) {
    let socket = UdpSocket::bind("0.0.0.0:0").unwrap();
    let target = SocketAddrV4::new(MCAST_ADDR, MCAST_PORT);
    let payload = MulticastPayload { port };
    let payload = serde_json::to_string(&payload).unwrap();
    debug!("sending {payload}");
    loop {
        socket.send_to(payload.as_bytes(), target).unwrap();
        thread::sleep(Duration::from_millis(500));
    }
}

pub fn recv_emitted_info<R: Runtime>(window: Window<R>) {
    let socket = UdpSocket::bind(("0.0.0.0", MCAST_PORT)).unwrap();
    socket
        .join_multicast_v4(&MCAST_ADDR, &Ipv4Addr::UNSPECIFIED)
        .unwrap();
    let mut buf = [0u8; 0x1000];
    let mut devices = HashSet::new();
    loop {
        let (amt, from) = socket.recv_from(&mut buf).unwrap();
        if let Ok(payload) = serde_json::from_slice::<MulticastPayload>(&buf[..amt]) {
            let server_config = ServerConfiguration {
                ip: from.ip().to_string(),
                port: payload.port,
            };
            devices.insert(server_config);
            let data = serde_json::to_string(&devices).unwrap();
            window.emit("device-list-updated", data).unwrap();
        };
    }
}
