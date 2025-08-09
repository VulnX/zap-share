use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Ipd;
#[cfg(mobile)]
use mobile::Ipd;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the ipd APIs.
pub trait IpdExt<R: Runtime> {
  fn ipd(&self) -> &Ipd<R>;
}

impl<R: Runtime, T: Manager<R>> crate::IpdExt<R> for T {
  fn ipd(&self) -> &Ipd<R> {
    self.state::<Ipd<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("ipd")
    .invoke_handler(tauri::generate_handler![commands::get_shared_uri_list])
    .setup(|app, api| {
      #[cfg(mobile)]
      let ipd = mobile::init(app, api)?;
      #[cfg(desktop)]
      let ipd = desktop::init(app, api)?;
      app.manage(ipd);
      Ok(())
    })
    .build()
}
