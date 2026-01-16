pub trait MapStringError<T> {
    fn mse(self) -> Result<T, String>;
}
impl<T> MapStringError<T> for Result<T, eyre::Report> {
    fn mse(self) -> Result<T, String> {
        self.map_err(|err| err.to_string())
    }
}
