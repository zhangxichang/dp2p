use eyre::{Result, eyre};

pub trait OptionGet<T> {
    fn get(self) -> Result<T>;
}
impl<T> OptionGet<T> for Option<T> {
    fn get(self) -> Result<T> {
        self.ok_or(eyre!("空值"))
    }
}
