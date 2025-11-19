pub trait OptionExt<T> {
    fn out(self) -> Result<T, Error>;
    fn get(&self) -> Result<&T, Error>;
}
impl<T> OptionExt<T> for Option<T> {
    fn out(self) -> Result<T, Error> {
        self.ok_or("空值".to_string().into())
    }
    fn get(&self) -> Result<&T, Error> {
        self.as_ref().ok_or("空值".to_string().into())
    }
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("{error}")]
    User { error: String },
    #[error(transparent)]
    Eyre(#[from] eyre::Report),
    #[error(transparent)]
    IO(#[from] std::io::Error),
    #[error(transparent)]
    Rusqlite(#[from] rusqlite::Error),
    #[error(transparent)]
    TryFromSlice(#[from] std::array::TryFromSliceError),
}
impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
impl From<String> for Error {
    fn from(value: String) -> Self {
        Self::User { error: value }
    }
}
