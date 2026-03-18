use tauri::command;
use crate::hardware::{collect_fingerprint, FingerprintComponents};
use crate::license::{validate_license, store_license};

/// Returns the current machine's hardware fingerprint components.
/// Called from React to display the hardware ID during license activation.
#[command]
pub fn get_hardware_fingerprint() -> FingerprintComponents {
    collect_fingerprint()
}

/// Checks whether a valid license is installed for this hardware.
/// Called on every app startup.
#[command]
pub fn check_license() -> bool {
    let fp = collect_fingerprint();
    validate_license(&fp).is_ok()
}

/// Stores a license file received from the license-server after purchase.
/// The React frontend calls this after a successful /activate response.
#[command]
pub fn activate_license(license_json: String) -> Result<(), String> {
    // Validate before storing
    let fp = collect_fingerprint();
    let license: crate::license::LicenseFile = serde_json::from_str(&license_json)
        .map_err(|e| e.to_string())?;

    if !license.fp.matches(&fp, 3) {
        return Err("License fingerprint does not match this hardware".to_string());
    }

    // TODO: verify Ed25519 signature before storing

    store_license(&license_json)
}

/// Reads and decrypts a .mirath file from disk.
/// Returns the raw JSON content (decryption handled in Rust, JS receives plain JSON).
///
/// TODO: implement AES-256-GCM decryption
#[command]
pub async fn open_mirath_file(path: String) -> Result<String, String> {
    let _ = path;
    Err("open_mirath_file not yet implemented".to_string())
}

/// Encrypts and saves case data as a .mirath file to disk.
///
/// TODO: implement AES-256-GCM encryption
#[command]
pub async fn save_mirath_file(path: String, content_json: String) -> Result<(), String> {
    let _ = (path, content_json);
    Err("save_mirath_file not yet implemented".to_string())
}
