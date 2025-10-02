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
  pub fn get_shared_data(&self) -> crate::Result<GetSharedDataResponse> {
    let res: crate::Result<GetSharedData> = self
      .0
      .run_mobile_plugin("getSharedData", ())
      .map_err(Into::into);

    let res = res?;

    let data;
    if res.shared_text == "" && res.uri_list == "[]" {
        data = None;
    } else if res.shared_text == "" {
        data = Some(SharedData::URIList(res.uri_list));
    } else {
        data = Some(SharedData::SharedText(res.shared_text));
    }
    Ok(GetSharedDataResponse { data })
  }
}
