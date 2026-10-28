//! Native Windows hardware power metrics collector using PDH, GetSystemTimes, and Win32 Power API.
//!
//! Exposes real-time Watts (Total, CPU Package, CPU Cores), Battery %, and Overall CPU Usage %.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HardwarePowerMetrics {
    pub is_ac: bool,
    pub battery_pct: u8,
    pub total_power_w: f32,
    pub cpu_pkg_w: f32,
    pub cpu_cores_w: f32,
    pub cpu_usage_pct: f32,
    pub mode: String,
}

impl Default for HardwarePowerMetrics {
    fn default() -> Self {
        Self {
            is_ac: true,
            battery_pct: 100,
            total_power_w: 0.0,
            cpu_pkg_w: 0.0,
            cpu_cores_w: 0.0,
            cpu_usage_pct: 0.0,
            mode: "ac".into(),
        }
    }
}

#[cfg(windows)]
mod win {
    #[repr(C)]
    struct SystemPowerStatus {
        ac_line_status: u8,
        battery_flag: u8,
        battery_life_percent: u8,
        system_status_flag: u8,
        battery_life_time: u32,
        battery_full_life_time: u32,
    }

    #[repr(C)]
    pub struct FileTime {
        dw_low_date_time: u32,
        dw_high_date_time: u32,
    }

    type HQuery = isize;
    type HCounter = isize;
    type PdhStatus = u32;

    const PDH_FMT_DOUBLE: u32 = 0x0000_0200;

    #[repr(C)]
    struct PdhFmtCountervalueDouble {
        _c_status: u32,
        double_value: f64,
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn GetSystemPowerStatus(lp_system_power_status: *mut SystemPowerStatus) -> i32;
        fn GetSystemTimes(
            lp_idle_time: *mut FileTime,
            lp_kernel_time: *mut FileTime,
            lp_user_time: *mut FileTime,
        ) -> i32;
    }

    #[link(name = "pdh")]
    extern "system" {
        fn PdhOpenQueryW(
            sz_data_source: *const u16,
            dw_user_data: usize,
            ph_query: *mut HQuery,
        ) -> PdhStatus;
        fn PdhAddCounterW(
            h_query: HQuery,
            sz_full_counter_path: *const u16,
            dw_user_data: usize,
            ph_counter: *mut HCounter,
        ) -> PdhStatus;
        fn PdhCollectQueryData(h_query: HQuery) -> PdhStatus;
        fn PdhGetFormattedCounterValue(
            h_counter: HCounter,
            dw_format: u32,
            lpdw_type: *mut u32,
            value: *mut PdhFmtCountervalueDouble,
        ) -> PdhStatus;
        fn PdhCloseQuery(h_query: HQuery) -> PdhStatus;
    }

    fn to_wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    pub fn ft_to_u64(ft: &FileTime) -> u64 {
        ((ft.dw_high_date_time as u64) << 32) | (ft.dw_low_date_time as u64)
    }

    pub fn get_cpu_times() -> (u64, u64, u64) {
        unsafe {
            let mut idle = FileTime {
                dw_low_date_time: 0,
                dw_high_date_time: 0,
            };
            let mut kernel = FileTime {
                dw_low_date_time: 0,
                dw_high_date_time: 0,
            };
            let mut user = FileTime {
                dw_low_date_time: 0,
                dw_high_date_time: 0,
            };
            if GetSystemTimes(&mut idle, &mut kernel, &mut user) != 0 {
                (ft_to_u64(&idle), ft_to_u64(&kernel), ft_to_u64(&user))
            } else {
                (0, 0, 0)
            }
        }
    }

    pub struct PdhPowerSession {
        query: HQuery,
        total_counter: HCounter,
        cpu_pkg_counter: HCounter,
        cpu_pp0_counter: HCounter,
        initialized: bool,
    }

    unsafe impl Send for PdhPowerSession {}

    impl PdhPowerSession {
        pub fn new() -> Self {
            let mut query: HQuery = 0;
            let mut total_counter: HCounter = 0;
            let mut cpu_pkg_counter: HCounter = 0;
            let mut cpu_pp0_counter: HCounter = 0;

            unsafe {
                if PdhOpenQueryW(std::ptr::null(), 0, &mut query) == 0 {
                    let p_total = to_wide(r"\Power Meter(_total)\Power");
                    let p_pkg = to_wide(r"\Energy Meter(rapl_package0_pkg)\Power");
                    let p_pp0 = to_wide(r"\Energy Meter(rapl_package0_pp0)\Power");

                    let _ = PdhAddCounterW(query, p_total.as_ptr(), 0, &mut total_counter);
                    let _ = PdhAddCounterW(query, p_pkg.as_ptr(), 0, &mut cpu_pkg_counter);
                    let _ = PdhAddCounterW(query, p_pp0.as_ptr(), 0, &mut cpu_pp0_counter);

                    let _ = PdhCollectQueryData(query);
                }
            }

            Self {
                query,
                total_counter,
                cpu_pkg_counter,
                cpu_pp0_counter,
                initialized: query != 0,
            }
        }

        pub fn sample(&mut self) -> (f32, f32, f32) {
            if !self.initialized || self.query == 0 {
                return (0.0, 0.0, 0.0);
            }

            unsafe {
                if PdhCollectQueryData(self.query) != 0 {
                    return (0.0, 0.0, 0.0);
                }

                let read_counter = |counter: HCounter| -> f32 {
                    if counter == 0 {
                        return 0.0;
                    }
                    let mut val = PdhFmtCountervalueDouble {
                        _c_status: 0,
                        double_value: 0.0,
                    };
                    let mut counter_type = 0u32;
                    if PdhGetFormattedCounterValue(
                        counter,
                        PDH_FMT_DOUBLE,
                        &mut counter_type,
                        &mut val,
                    ) == 0
                    {
                        (val.double_value / 1000.0) as f32
                    } else {
                        0.0
                    }
                };

                let total_w = read_counter(self.total_counter);
                let cpu_pkg_w = read_counter(self.cpu_pkg_counter);
                let cpu_pp0_w = read_counter(self.cpu_pp0_counter);

                (total_w, cpu_pkg_w, cpu_pp0_w)
            }
        }
    }

    impl Drop for PdhPowerSession {
        fn drop(&mut self) {
            if self.query != 0 {
                unsafe {
                    let _ = PdhCloseQuery(self.query);
                }
            }
        }
    }

    pub fn get_battery_status() -> (bool, u8) {
        unsafe {
            let mut status = SystemPowerStatus {
                ac_line_status: 255,
                battery_flag: 255,
                battery_life_percent: 100,
                system_status_flag: 0,
                battery_life_time: 0,
                battery_full_life_time: 0,
            };
            if GetSystemPowerStatus(&mut status) != 0 {
                let is_ac = status.ac_line_status == 1;
                let pct = if status.battery_life_percent <= 100 {
                    status.battery_life_percent
                } else {
                    100
                };
                (is_ac, pct)
            } else {
                (true, 100)
            }
        }
    }
}

pub struct PowerState {
    #[cfg(windows)]
    session: Mutex<win::PdhPowerSession>,
    #[cfg(windows)]
    last_cpu_times: Mutex<(u64, u64, u64)>,
}

impl PowerState {
    pub fn new() -> Self {
        Self {
            #[cfg(windows)]
            session: Mutex::new(win::PdhPowerSession::new()),
            #[cfg(windows)]
            last_cpu_times: Mutex::new(win::get_cpu_times()),
        }
    }

    pub fn read_metrics(&self) -> HardwarePowerMetrics {
        #[cfg(windows)]
        {
            let (is_ac, battery_pct) = win::get_battery_status();
            let (mut total_w, cpu_pkg_w, cpu_pp0_w) = if let Ok(mut s) = self.session.lock() {
                s.sample()
            } else {
                (0.0, 0.0, 0.0)
            };

            if total_w <= 0.01 && cpu_pkg_w > 0.01 {
                total_w = cpu_pkg_w + 3.5;
            }

            let (idle, kernel, user) = win::get_cpu_times();
            let cpu_usage_pct = if let Ok(mut prev) = self.last_cpu_times.lock() {
                let (p_idle, p_kernel, p_user) = *prev;
                *prev = (idle, kernel, user);
                if p_kernel > 0 && kernel >= p_kernel && user >= p_user {
                    let d_idle = idle.saturating_sub(p_idle);
                    let d_kernel = kernel.saturating_sub(p_kernel);
                    let d_user = user.saturating_sub(p_user);
                    let total = d_kernel + d_user;
                    if total > 0 {
                        let busy = total.saturating_sub(d_idle);
                        let pct = (busy as f32 / total as f32) * 100.0;
                        pct.clamp(0.0, 100.0)
                    } else {
                        0.0
                    }
                } else {
                    0.0
                }
            } else {
                0.0
            };

            HardwarePowerMetrics {
                is_ac,
                battery_pct,
                total_power_w: (total_w * 100.0).round() / 100.0,
                cpu_pkg_w: (cpu_pkg_w * 100.0).round() / 100.0,
                cpu_cores_w: (cpu_pp0_w * 100.0).round() / 100.0,
                cpu_usage_pct: (cpu_usage_pct * 10.0).round() / 10.0,
                mode: if is_ac {
                    "ac".to_string()
                } else {
                    "battery".to_string()
                },
            }
        }
        #[cfg(not(windows))]
        {
            HardwarePowerMetrics::default()
        }
    }
}

impl Default for PowerState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_hardware_power_metrics() {
        let m = HardwarePowerMetrics::default();
        assert!(m.is_ac);
        assert_eq!(m.battery_pct, 100);
        assert_eq!(m.total_power_w, 0.0);
        assert_eq!(m.mode, "ac");
    }

    #[test]
    fn test_power_state_instantiation() {
        let state = PowerState::new();
        let _ = state.read_metrics();
    }
}
