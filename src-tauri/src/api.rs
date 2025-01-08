use crate::server;
use std::{
    io::{stdin, stdout, Read, Write},
    sync::mpsc,
    thread,
    time::Duration,
};

#[allow(dead_code)]
#[derive(Debug)]
pub struct Url {
    ip: Option<String>,
    port: u16
}

#[derive(Debug)]
pub enum StartServerResponse {
    Success(Url),
    Error(String),
}


/// Starts server in `send` mode
/// 
/// Assumes filepath is a valid path to the user selected file, or a content URI in case of android.
///
/// Return value:
/// ```javascript
/// {
///   "Success": {
///     "ip": String | Null, // Automatic IP detection may fail
///     "port": Number
///   }
/// }
/// ```
/// 
/// or
/// 
/// ```javascript
/// { "Error": "<error message>" }
/// ```
#[tauri::command]
pub async fn send_file(filepath: String) -> StartServerResponse {
    dbg!(filepath);
    start_server()
}

pub fn pause() {
    let mut stdout = stdout();
    stdout.write(b"Press Enter to continue...").unwrap();
    stdout.flush().unwrap();
    stdin().read(&mut [0]).unwrap();
}

/// Starts (or re-starts existing) actix web server in separate thread
fn start_server() -> StartServerResponse {
    let (tx, rx) = mpsc::channel::<u16>();
    thread::spawn(|| {
        server::start_server(tx);
    });
    let port;
    match rx.recv_timeout(Duration::from_secs(10)) {
        Ok(n) => port = n,
        Err(_) => return StartServerResponse::Error("Timeout: Failed to start server".into()),
    }
    let ip = local_ip_address::local_ip().ok().map(|ip| ip.to_string());
    StartServerResponse::Success(Url {
        ip,
        port
    })
}