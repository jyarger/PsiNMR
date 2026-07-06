// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// PsiNMR desktop is intentionally thin: the main window loads the hosted web
// app (see tauri.conf.json `app.windows[].url`), so every web deploy — and
// eventually the Pro backend/login — is live in the desktop app immediately,
// with no rebuild. Only the native shell itself is versioned here, and it
// updates through the Tauri updater plugin from GitHub Releases.
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running the PsiNMR desktop shell");
}
