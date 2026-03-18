use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use crate::hardware::FingerprintComponents;

/// The Ed25519 public key, baked into the binary at compile time.
/// Set the ED25519_PUBLIC_KEY environment variable during build.
/// In production this should be the base64-encoded public key from your license-server.
const ED25519_PUBLIC_KEY_B64: &str = env!("ED25519_PUBLIC_KEY", "ED25519_PUBLIC_KEY not set at compile time");

#[derive(Serialize, Deserialize, Debug)]
pub struct LicenseFile {
    pub lid: String,
    pub pid: String,
    pub fp: FingerprintComponents,
    pub iat: u64,
    pub license_type: String,
    pub sig: String,   // base64-encoded Ed25519 signature
}

#[derive(Debug)]
pub enum LicenseError {
    NotFound,
    InvalidSignature,
    FingerprintMismatch,
    ParseError(String),
}

impl std::fmt::Display for LicenseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LicenseError::NotFound => write!(f, "License file not found"),
            LicenseError::InvalidSignature => write!(f, "License signature is invalid"),
            LicenseError::FingerprintMismatch => write!(f, "Hardware fingerprint does not match"),
            LicenseError::ParseError(e) => write!(f, "License parse error: {e}"),
        }
    }
}

/// Returns the OS-specific path where the license file is stored.
///
/// macOS:   ~/Library/Application Support/Mirath/license.lic
/// Windows: %APPDATA%\Mirath\license.lic
/// Linux:   ~/.config/mirath/license.lic
pub fn license_file_path() -> PathBuf {
    let base = dirs::config_dir()
        .or_else(|| dirs::home_dir())
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("Mirath").join("license.lic")
}

/// Loads and validates the license file from disk.
/// Verifies Ed25519 signature and checks hardware fingerprint (3-of-4 tolerance).
///
/// TODO: implement signature verification with ed25519-dalek
pub fn validate_license(current_fp: &FingerprintComponents) -> Result<LicenseFile, LicenseError> {
    let path = license_file_path();

    if !path.exists() {
        return Err(LicenseError::NotFound);
    }

    let contents = std::fs::read_to_string(&path)
        .map_err(|e| LicenseError::ParseError(e.to_string()))?;

    let license: LicenseFile = serde_json::from_str(&contents)
        .map_err(|e| LicenseError::ParseError(e.to_string()))?;

    // TODO: verify Ed25519 signature using ED25519_PUBLIC_KEY_B64
    let _ = ED25519_PUBLIC_KEY_B64;

    // Check fingerprint — require 3 of 4 components to match
    if !license.fp.matches(current_fp, 3) {
        return Err(LicenseError::FingerprintMismatch);
    }

    Ok(license)
}

/// Saves a license file (received from license-server after activation) to disk.
pub fn store_license(license_json: &str) -> Result<(), String> {
    let path = license_file_path();

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(&path, license_json).map_err(|e| e.to_string())
}
