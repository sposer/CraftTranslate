use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SelectionPayload {
    pub text: String,
    pub x: i32,
    pub y: i32,
}
