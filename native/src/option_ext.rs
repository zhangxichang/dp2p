use eyre::{Result, eyre};

pub trait OptionGet<T> {
    fn get(&self) -> Result<&T>;
    fn get_move(self) -> Result<T>;
}
impl<T> OptionGet<T> for Option<T> {
    fn get(&self) -> Result<&T> {
        self.as_ref().ok_or(eyre!("空值"))
    }
    fn get_move(self) -> Result<T> {
        self.ok_or(eyre!("空值"))
    }
}
pub trait OptionGetClone<T> {
    fn get_clone(&self) -> Result<T>;
}
impl<T: Clone> OptionGetClone<T> for Option<T> {
    fn get_clone(&self) -> Result<T> {
        self.clone().ok_or(eyre!("空值"))
    }
}
