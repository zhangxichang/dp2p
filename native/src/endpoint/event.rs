use endpoint::service::Event;

use crate::{
    error::{Error, OptionGet},
    state::State,
};

#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_event_as_request_remote_id(
    state: tauri::State<'_, State>,
) -> Result<String, Error> {
    Ok(match state.endpoint.event_next.lock().get()? {
        Event::FriendRequest(friend_request) => friend_request.remote_id().to_string(),
        Event::ChatRequest(chat_request) => chat_request.remote_id().to_string(),
    })
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_event_as_request_accept(state: tauri::State<'_, State>) -> Result<(), Error> {
    Ok(match state.endpoint.event_next.lock().take().get_move()? {
        Event::FriendRequest(friend_request) => friend_request.accept()?,
        _ => return Err("返回值被忽略".to_string().into()),
    })
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_event_as_request_reject(state: tauri::State<'_, State>) -> Result<(), Error> {
    Ok(match state.endpoint.event_next.lock().take().get_move()? {
        Event::FriendRequest(friend_request) => friend_request.reject()?,
        Event::ChatRequest(chat_request) => chat_request.reject()?,
    })
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_event_as_chat_request_accept(
    state: tauri::State<'_, State>,
) -> Result<usize, Error> {
    Ok(
        if let Event::ChatRequest(value) = state.endpoint.event_next.lock().take().get_move()? {
            state.endpoint.connections.write().insert(value.accept()?)
        } else {
            return Err("类型错误".to_string().into());
        },
    )
}
