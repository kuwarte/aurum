#![cfg_attr(target_arch = "wasm32", no_std)]
#![cfg_attr(target_arch = "wasm32", no_main)]

#[allow(unused_imports)]
use aurum_odra_contracts::*;

#[cfg(not(target_arch = "wasm32"))]
fn main() {}
