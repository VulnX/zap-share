use actix_web::{web, HttpResponse, Responder};
use futures_util::StreamExt;
use log::debug;
use tauri::{Manager, Window};
use tokio::{
    fs,
    io::{AsyncWriteExt, BufWriter},
};

#[allow(unreachable_code)]
pub async fn upload() -> impl Responder {
    HttpResponse::Ok().body(include_str!("../static/upload.html"))
}

pub async fn upload_file(
    window: web::Data<Window>,
    path: web::Path<(String, u64)>,
    mut body: web::Payload,
) -> impl Responder {
    let (filename, filesize) = path.into_inner();
    debug!("{filename:#?}");
    debug!("{filesize:#?}");

    let mut write_path = window.path().download_dir().unwrap();
    write_path.push(filename);

    let file = fs::File::create(write_path).await.unwrap();
    let mut bufwriter = BufWriter::new(file);
    while let Some(chunk) = body.next().await {
        let chunk = chunk.unwrap();
        bufwriter.write_all(&chunk).await.unwrap();
    }
    debug!("saved on disk");

    HttpResponse::Ok()
}
