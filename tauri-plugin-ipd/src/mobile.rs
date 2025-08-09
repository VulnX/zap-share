use serde::de::DeserializeOwned;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_ipd);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<Ipd<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("com.plugin.ipd", "SharePlugin")?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_ipd)?;
  Ok(Ipd(handle))
}

/// Access to the ipd APIs.
pub struct Ipd<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Ipd<R> {
  pub fn get_shared_uri_list(&self) -> crate::Result<GetSharedUriListResponse> {
    self
      .0
      .run_mobile_plugin("getSharedUriList", ())
      .map_err(Into::into)
  }
}
