use actix_web::{rt, web, App, HttpResponse, HttpServer, Responder};
use std::sync::mpsc;

async fn index() -> impl Responder {
    HttpResponse::Ok().body("it's working")
}

pub fn start_server(tx: mpsc::Sender<u16>) {
    let server;
    loop {
        let _server = HttpServer::new(|| App::new().route("/", web::get().to(index)));
        if let Ok(_server) = _server.bind(("0.0.0.0", 0)) {
            server = _server;
            break;
        }
        // The caller function should handle `recv_timeout` because this may
        // (hypothetically) get stuck in an infinite loop
    }
    let port = server
        .addrs()
        .first()
        .expect("valid address from server")
        .port();
    tx.send(port).unwrap();

    rt::System::new().block_on(server.run()).unwrap();
}
