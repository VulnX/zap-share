use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct ProgressUpdatePayload {
    pub id: String,
    pub progress: f32,
}