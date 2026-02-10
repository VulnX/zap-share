//! UDP Broadcasting for Device Discovery
//!
//! This module implements UDP broadcasting functionality for discovering and announcing
//! devices on the local network. Devices broadcast their presence and connection information,
//! allowing peer-to-peer connection establishment without manual configuration.
//!
//! # Architecture
//!
//! - **Emission**: Devices broadcast their server port and identification via UDP
//! - **Reception**: Devices listen for broadcasts from other devices on the network
//! - **Discovery**: Maintains a dynamic list of available devices
//!
//! # Network Details
//!
//! - Default broadcast port: 54321
//! - Broadcast interval: 500ms
//! - Uses UDP broadcast to multiple subnet candidates for maximum compatibility

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
use tauri::{Emitter, Runtime, Window};

use crate::{api, models};

/// Default UDP port for device discovery broadcasts.
///
/// This port must be consistent across all devices for discovery to work.
static BCAST_PORT: u16 = 54321;

/// Detects the appropriate broadcast address for the local network.
///
/// This function attempts to find a working broadcast address by testing multiple
/// candidates based on the local IP address. It starts with the most specific
/// broadcast address and falls back to more general ones.
///
/// # Algorithm
///
/// Given a local IP like `192.168.1.5`, it tries in order:
/// 1. `192.168.1.255` (subnet broadcast)
/// 2. `192.168.255.255` (larger subnet)
/// 3. `192.255.255.255` (even larger subnet)
/// 4. `255.255.255.255` (global broadcast)
///
/// # Arguments
///
/// * `socket` - UDP socket configured with broadcast enabled
///
/// # Returns
///
/// The first working broadcast address from the candidate list.
///
/// # Panics
///
/// Panics if none of the broadcast candidates work (should be unreachable in practice).
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

/// Broadcasts device information to the local network.
///
/// This function runs in a separate thread and continuously broadcasts the device's
/// server port and identification information so other devices can discover it.
///
/// # Arguments
///
/// * `port` - The HTTP server port to advertise
/// * `config` - Device configuration (fingerprint and name)
/// * `shutdown` - Atomic flag to signal thread shutdown
///
/// # Broadcast Payload
///
/// The payload contains:
/// - Server port number
/// - Unique device fingerprint
/// - Human-friendly device name
///
/// # Timing
///
/// Broadcasts are sent every 500ms until the shutdown signal is received.
pub fn emit_info(port: u16, config: models::DeviceConfig, shutdown: Arc<AtomicBool>) {
    let socket = UdpSocket::bind("0.0.0.0:0").unwrap();
    socket.set_broadcast(true).unwrap();
    let payload = models::MulticastPayload {
        port,
        fingerprint: config.fingerprint,
        name: config.name,
    };
    let payload = serde_json::to_string(&payload).unwrap();
    debug!("sending {payload}");
    let target = detect_broadcast_target(&socket);
    while !shutdown.load(Ordering::Relaxed) {
        socket.send_to(payload.as_bytes(), target).unwrap();
        thread::sleep(Duration::from_millis(500));
    }
}

/// Listens for device discovery broadcasts from other devices.
///
/// This function runs in a separate thread and continuously listens for UDP broadcasts
/// from other devices on the network. When a device is discovered, it emits a
/// `device-list-updated` event to the frontend with the updated device list.
///
/// # Arguments
///
/// * `window` - Tauri window for emitting events to the frontend
/// * `config` - Local device configuration (to filter out self-broadcasts)
/// * `shutdown` - Atomic flag to signal thread shutdown
///
/// # Device Filtering
///
/// - Ignores broadcasts from the device itself (matched by fingerprint)
/// - Updates existing device entries if the IP changes
/// - Maintains a deduplicated set of discovered devices
///
/// # Event Emission
///
/// Emits a `device-list-updated` event with a JSON array of discovered devices
/// whenever the device list changes.
///
/// # Timing
///
/// Uses a 1-second read timeout to allow periodic shutdown checks.
pub fn recv_emitted_info<R: Runtime>(
    window: Window<R>,
    config: models::DeviceConfig,
    shutdown: Arc<AtomicBool>,
) {
    let socket = UdpSocket::bind(("0.0.0.0", BCAST_PORT)).unwrap();
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
                    if payload.fingerprint == config.fingerprint {
                        // Self device detected
                        continue;
                    }
                    let server_config = models::ServerConfiguration {
                        ip: from.ip().to_string(),
                        port: payload.port,
                        name: payload.name,
                    };
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
            Err(e) => panic!("recv_from error: {e}"),
        };
    }
}
