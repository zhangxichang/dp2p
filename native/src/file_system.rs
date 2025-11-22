use std::path::PathBuf;

use tokio::{
    fs::{self, File, create_dir_all, remove_dir_all, remove_file},
    io::{AsyncReadExt, AsyncWriteExt},
};

use crate::error::Error;

#[tauri::command(rename_all = "snake_case")]
pub async fn fs_remove_file(path: String) -> Result<(), Error> {
    remove_file(path).await?;
    Ok(())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn fs_read_file(path: String) -> Result<Vec<u8>, Error> {
    let mut buf = Vec::new();
    File::open(path).await?.read_to_end(&mut buf).await?;
    Ok(buf)
}
#[tauri::command(rename_all = "snake_case")]
pub async fn fs_create_file(path: String, bytes: Vec<u8>) -> Result<(), Error> {
    if let Some(parent_path) = PathBuf::from(&path).parent() {
        create_dir_all(parent_path).await?;
    }
    File::create(path).await?.write_all(&bytes).await?;
    Ok(())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn fs_exists(path: String) -> Result<bool, Error> {
    Ok(fs::try_exists(path).await?)
}
#[tauri::command(rename_all = "snake_case")]
pub async fn fs_remove_dir_all(path: String) -> Result<(), Error> {
    remove_dir_all(path).await?;
    Ok(())
}
