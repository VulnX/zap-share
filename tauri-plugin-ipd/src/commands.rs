use tauri::{AppHandle, command, Runtime};

use crate::models::*;
use crate::Result;
use crate::IpdExt;

#[command]
pub(crate) async fn get_shared_uri_list<R: Runtime>(
    app: AppHandle<R>
) -> Result<GetSharedUriListResponse> {
    app.ipd().get_shared_uri_list()
}
