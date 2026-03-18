use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use ed25519_dalek::{VerifyingKey, Signature, Verifier};
use base64::{Engine as _, engine::general_purpose::STANDARD as B64};
use crate::hardware::FingerprintComponents;

const ED25519_PUBLIC_KEY_B64: Option<&str> = option_env!("ED25519_PUBLIC_KEY");

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LicenseFile {
    pub lid: String,
    pub email: String,
    pub pid: String,
    pub fp: FingerprintComponents,
    pub iat: u64,
    pub license_type: String,
    pub sig: String,
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

pub fn license_file_path() -> PathBuf {
    let base = dirs::config_dir()
        .or_else(|| dirs::home_dir())
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("Mirath").join("license.lic")
}

pub fn verify_signature(license: &LicenseFile) -> Result<(), LicenseError> {
    let Some(key_b64) = ED25519_PUBLIC_KEY_B64 else {
        return Ok(());
    };

    let key_bytes = B64.decode(key_b64)
        .map_err(|_| LicenseError::InvalidSignature)?;

    let key_array: [u8; 32] = key_bytes
        .try_into()
        .map_err(|_| LicenseError::InvalidSignature)?;

    let verifying_key = VerifyingKey::from_bytes(&key_array)
        .map_err(|_| LicenseError::InvalidSignature)?;

    let sig_bytes = B64.decode(&license.sig)
        .map_err(|_| LicenseError::InvalidSignature)?;

    let sig_array: [u8; 64] = sig_bytes
        .try_into()
        .map_err(|_| LicenseError::InvalidSignature)?;

    let signature = Signature::from_bytes(&sig_array);

    let payload = build_signing_payload(license);

    verifying_key
        .verify(payload.as_bytes(), &signature)
        .map_err(|_| LicenseError::InvalidSignature)
}

fn build_signing_payload(license: &LicenseFile) -> String {
    format!(
        "{}|{}|{}|{}",
        license.lid,
        license.email,
        license.fp.hash,
        license.iat
    )
}

pub fn validate_license(current_fp: &FingerprintComponents) -> Result<LicenseFile, LicenseError> {
    let path = license_file_path();

    if !path.exists() {
        return Err(LicenseError::NotFound);
    }

    let contents = std::fs::read_to_string(&path)
        .map_err(|e| LicenseError::ParseError(e.to_string()))?;

    let license: LicenseFile = serde_json::from_str(&contents)
        .map_err(|e| LicenseError::ParseError(e.to_string()))?;

    verify_signature(&license)?;

    if !license.fp.matches(current_fp, 3) {
        return Err(LicenseError::FingerprintMismatch);
    }

    Ok(license)
}

pub fn store_license(license_json: &str) -> Result<(), String> {
    let path = license_file_path();

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(&path, license_json).map_err(|e| e.to_string())
}
