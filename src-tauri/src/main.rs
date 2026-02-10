//! IPD Application Binary Entry Point
//!
//! This is the main executable entry point for the IPD (Inter-Platform Data Transfer) application.
//! It simply delegates to the library's `run()` function which contains all the application logic.
//!
//! # Platform-Specific Configuration
//!
//! On Windows in release builds, the application runs without showing a console window.
//! This is controlled by the `windows_subsystem` attribute below.

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod models;
mod server;

fn main() {
    ipd_lib::run()
}
