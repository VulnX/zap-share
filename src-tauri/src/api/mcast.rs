use std::{
    net::{Ipv4Addr, SocketAddrV4, UdpSocket},
    thread,
    time::Duration,
};

use log::debug;

static MCAST_ADDR: Ipv4Addr = Ipv4Addr::new(239, 255, 255, 250);
static MCAST_PORT: u16 = 37020;

pub fn emit_info() {
    let message = uuid::Uuid::new_v4().to_string();
    let socket = UdpSocket::bind("0.0.0.0:0").unwrap();
    let target = SocketAddrV4::new(MCAST_ADDR, MCAST_PORT);
    loop {
        socket.send_to(message.as_bytes(), target).unwrap();
        debug!("SENT {message:#?}");
        thread::sleep(Duration::from_millis(500));
    }
}

pub fn recv_emitted_info() {
    let socket = UdpSocket::bind(("0.0.0.0", MCAST_PORT)).unwrap();
    socket
        .join_multicast_v4(&MCAST_ADDR, &Ipv4Addr::UNSPECIFIED)
        .unwrap();
    let mut buf = [0u8; 0x1000];
    loop {
        let (amt, from) = socket.recv_from(&mut buf).unwrap();
        let msg = String::from_utf8_lossy(&buf[..amt]);
        println!("Received {amt:#?} bytes from {from:#?} => {msg:#?}");
    }
}
