use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::IpdExt;
use crate::Result;

#[command]
pub(crate) async fn get_shared_data_something<R: Runtime>(
    app: AppHandle<R>,
) -> Result<GetSharedDataResponse> {
    app.ipd().get_shared_data()
}
