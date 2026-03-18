use sha2::{Sha256, Digest};
use sysinfo::System;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct FingerprintComponents {
    pub machine_id: String,
    pub cpu: String,
    pub motherboard: String,
    pub mac: String,
}

impl FingerprintComponents {
    /// Returns true if at least `threshold` components match another fingerprint.
    /// Used for hardware upgrade tolerance (default threshold: 3 of 4).
    pub fn matches(&self, other: &FingerprintComponents, threshold: usize) -> bool {
        let matches = [
            self.machine_id == other.machine_id,
            self.cpu == other.cpu,
            self.motherboard == other.motherboard,
            self.mac == other.mac,
        ]
        .iter()
        .filter(|&&m| m)
        .count();

        matches >= threshold
    }
}

/// Collects hardware identifiers and returns hashed component fingerprints.
/// Each component is individually SHA-256 hashed (not the raw value).
///
/// TODO: implement per-platform collection (macOS IOKit, Windows WMI, Linux /etc/machine-id)
pub fn collect_fingerprint() -> FingerprintComponents {
    let mut sys = System::new_all();
    sys.refresh_all();

    FingerprintComponents {
        machine_id: hash_string(&get_machine_id()),
        cpu: hash_string(&get_cpu_string(&sys)),
        motherboard: hash_string(&get_motherboard_id()),
        mac: hash_string(&get_primary_mac()),
    }
}

fn hash_string(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

fn get_machine_id() -> String {
    // TODO: macOS → IOPlatformUUID via IOKit
    // TODO: Windows → HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid
    // TODO: Linux → read /etc/machine-id
    "unknown-machine-id".to_string()
}

fn get_cpu_string(sys: &System) -> String {
    sys.cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "unknown-cpu".to_string())
}

fn get_motherboard_id() -> String {
    // TODO: macOS → system_profiler SPHardwareDataType | grep "Serial Number"
    // TODO: Windows → WMI Win32_BaseBoard.SerialNumber
    // TODO: Linux → dmidecode -t baseboard
    "unknown-motherboard".to_string()
}

fn get_primary_mac() -> String {
    // TODO: get the MAC address of the primary (non-virtual) network interface
    "unknown-mac".to_string()
}
