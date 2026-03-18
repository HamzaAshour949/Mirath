use sha2::{Sha256, Digest};
use sysinfo::System;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct FingerprintComponents {
    pub machine_id: String,
    pub cpu: String,
    pub motherboard: String,
    pub mac: String,
    pub hash: String,
}

impl FingerprintComponents {
    pub fn matches(&self, other: &FingerprintComponents, threshold: usize) -> bool {
        let count = [
            self.machine_id == other.machine_id,
            self.cpu == other.cpu,
            self.motherboard == other.motherboard,
            self.mac == other.mac,
        ]
        .iter()
        .filter(|&&m| m)
        .count();

        count >= threshold
    }
}

pub fn collect_fingerprint() -> FingerprintComponents {
    let mut sys = System::new_all();
    sys.refresh_all();

    let machine_id = get_machine_id();
    let cpu = get_cpu_string(&sys);
    let motherboard = get_motherboard_id();
    let mac = get_primary_mac();

    let combined = format!("{machine_id}|{cpu}|{motherboard}|{mac}");
    let hash = hash_string(&combined);

    FingerprintComponents {
        machine_id: hash_string(&machine_id),
        cpu: hash_string(&cpu),
        motherboard: hash_string(&motherboard),
        mac: hash_string(&mac),
        hash,
    }
}

fn hash_string(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

fn get_machine_id() -> String {
    #[cfg(target_os = "macos")]
    {
        let out = std::process::Command::new("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok());

        if let Some(text) = out {
            for line in text.lines() {
                if line.contains("IOPlatformUUID") {
                    if let Some(val) = line.split('"').nth(3) {
                        return val.to_string();
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let out = std::process::Command::new("reg")
            .args(["query", r"HKLM\SOFTWARE\Microsoft\Cryptography", "/v", "MachineGuid"])
            .output()
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok());

        if let Some(text) = out {
            for line in text.lines() {
                if line.contains("MachineGuid") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if let Some(guid) = parts.last() {
                        return guid.to_string();
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(id) = std::fs::read_to_string("/etc/machine-id") {
            let trimmed = id.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
    }

    "unknown-machine-id".to_string()
}

fn get_cpu_string(sys: &System) -> String {
    sys.cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "unknown-cpu".to_string())
}

fn get_motherboard_id() -> String {
    #[cfg(target_os = "macos")]
    {
        let out = std::process::Command::new("system_profiler")
            .arg("SPHardwareDataType")
            .output()
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok());

        if let Some(text) = out {
            for line in text.lines() {
                if line.contains("Serial Number") {
                    if let Some(val) = line.split(':').nth(1) {
                        return val.trim().to_string();
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let out = std::process::Command::new("wmic")
            .args(["baseboard", "get", "SerialNumber"])
            .output()
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok());

        if let Some(text) = out {
            let lines: Vec<&str> = text.lines().filter(|l| !l.trim().is_empty()).collect();
            if lines.len() >= 2 {
                let serial = lines[1].trim().to_string();
                if !serial.is_empty() {
                    return serial;
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(serial) = std::fs::read_to_string("/sys/class/dmi/id/board_serial") {
            let trimmed = serial.trim().to_string();
            if !trimmed.is_empty() && trimmed != "None" {
                return trimmed;
            }
        }
    }

    "unknown-motherboard".to_string()
}

fn get_primary_mac() -> String {
    use sysinfo::Networks;
    let networks = Networks::new_with_refreshed_list();

    for (name, data) in &networks {
        let lower = name.to_lowercase();
        if lower.starts_with("lo") || lower.contains("loopback") {
            continue;
        }
        let mac = data.mac_address().to_string();
        if mac != "00:00:00:00:00:00" && !mac.is_empty() {
            return mac;
        }
    }

    "unknown-mac".to_string()
}
