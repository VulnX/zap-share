use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetSharedData {
    pub uri_list: String,
    pub shared_text: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub enum SharedData {
    URIList(String),
    SharedText(String),
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GetSharedDataResponse {
    pub data: Option<SharedData>,
}
