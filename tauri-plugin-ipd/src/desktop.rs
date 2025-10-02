use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Ipd<R>> {
    Ok(Ipd(app.clone()))
}

/// Access to the ipd APIs.
pub struct Ipd<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Ipd<R> {
    pub fn get_shared_data(&self) -> crate::Result<GetSharedDataResponse> {
        Ok(GetSharedDataResponse { data: None })
    }
}
