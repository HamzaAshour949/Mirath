use tauri::command;
use tauri_plugin_dialog::DialogExt;
use crate::hardware::{collect_fingerprint, FingerprintComponents};
use crate::license::{validate_license, store_license, verify_signature, LicenseFile};

#[derive(serde::Serialize)]
pub struct LicenseStatus {
    pub valid: bool,
    #[serde(rename = "licenseId")]
    pub license_id: String,
    pub email: String,
}

#[command]
pub fn get_hardware_fingerprint() -> FingerprintComponents {
    collect_fingerprint()
}

#[command]
pub fn check_license() -> LicenseStatus {
    let fp = collect_fingerprint();
    match validate_license(&fp) {
        Ok(lic) => LicenseStatus {
            valid: true,
            license_id: lic.lid,
            email: lic.email,
        },
        Err(_) => LicenseStatus {
            valid: false,
            license_id: String::new(),
            email: String::new(),
        },
    }
}

#[command]
pub fn activate_license(license_json: String) -> Result<(), String> {
    let license: LicenseFile = serde_json::from_str(&license_json)
        .map_err(|e| e.to_string())?;

    verify_signature(&license).map_err(|e| e.to_string())?;

    let fp = collect_fingerprint();
    if !license.fp.matches(&fp, 3) {
        return Err("License fingerprint does not match this hardware".to_string());
    }

    store_license(&license_json)
}

#[command]
pub async fn open_mirath_file(app: tauri::AppHandle) -> Result<Vec<u8>, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("Mirath Case", &["mirath"])
        .blocking_pick_file();

    let Some(file_path) = file_path else {
        return Err("No file selected".to_string());
    };

    let path: std::path::PathBuf = file_path.into();
    std::fs::read(path).map_err(|e| e.to_string())
}

#[command]
pub async fn save_mirath_file(
    app: tauri::AppHandle,
    filename: String,
    bytes: Vec<u8>,
) -> Result<(), String> {
    let file_path = app
        .dialog()
        .file()
        .set_file_name(&filename)
        .add_filter("Mirath Case", &["mirath"])
        .blocking_save_file();

    let Some(file_path) = file_path else {
        return Err("No save location selected".to_string());
    };

    let path: std::path::PathBuf = file_path.into();
    std::fs::write(path, &bytes).map_err(|e| e.to_string())
}
