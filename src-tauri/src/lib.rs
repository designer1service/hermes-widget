// Windows GUI binary — suppress the console window in release builds.
// (See main.rs for the windows_subsystem attribute. main.rs is the binary
// entry point; lib.rs is the mobile entry.)
use std::path::PathBuf;
use sysinfo::System;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use rusqlite::{params, Connection};
use serde::Serialize;

const DAY_SECS: f64 = 24.0 * 3600.0;

/// Per-range aggregate (used for 7d, 30d, all).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RangeStats {
    sessions: i64,
    api_calls: i64,
    input_tokens: i64,
    output_tokens: i64,
    spent: f64,
}

/// A single row in the top-models list.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelRow {
    model: String,
    tokens: i64,
    cost: f64,
}

/// Full payload returned by `get_hermes_metrics`. One round-trip covers everything.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HermesMetrics {
    active_model: String,
    is_connection_active: bool,
    active_gateways: i64,
    stats_7d: RangeStats,
    stats_30d: RangeStats,
    all_time: RangeStats,
    top_models_7d: Vec<ModelRow>,
}

/// Resolve the Hermes state.db path.
/// On Windows: %LOCALAPPDATA%\hermes\state.db
fn state_db_path() -> Result<PathBuf, String> {
    let local = std::env::var("LOCALAPPDATA").map_err(|_| "LOCALAPPDATA not set".to_string())?;
    Ok(PathBuf::from(local).join("hermes").join("state.db"))
}

fn open_db() -> Result<Connection, String> {
    let path = state_db_path()?;
    Connection::open(&path).map_err(|e| format!("open {}: {}", path.display(), e))
}

fn now_unix() -> f64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs_f64())
        .unwrap_or(0.0)
}

/// Aggregate metrics for sessions within `[now - days*DAY_SECS, now]`.
fn aggregate_range(conn: &Connection, days: f64, now: f64) -> RangeStats {
    conn.query_row(
        "SELECT
            COUNT(*) as sessions,
            COALESCE(SUM(api_call_count), 0) as api_calls,
            COALESCE(SUM(input_tokens), 0) as input_tokens,
            COALESCE(SUM(output_tokens), 0) as output_tokens,
            COALESCE(SUM(estimated_cost_usd), 0.0) as spent
         FROM sessions WHERE started_at >= ?1",
        params![now - days * DAY_SECS],
        |r| {
            Ok(RangeStats {
                sessions: r.get(0)?,
                api_calls: r.get(1)?,
                input_tokens: r.get(2)?,
                output_tokens: r.get(3)?,
                spent: r.get(4)?,
            })
        },
    )
    .unwrap_or(RangeStats {
        sessions: 0,
        api_calls: 0,
        input_tokens: 0,
        output_tokens: 0,
        spent: 0.0,
    })
}

/// Top N models by total tokens for sessions in the last `days` days.
fn top_models(conn: &Connection, days: f64, now: f64, limit: i64) -> Vec<ModelRow> {
    let stmt = conn
        .prepare(
            "SELECT model,
                    COALESCE(SUM(input_tokens), 0) + COALESCE(SUM(output_tokens), 0) as tokens,
                    COALESCE(SUM(estimated_cost_usd), 0.0) as cost
             FROM sessions
             WHERE started_at >= ?1 AND model IS NOT NULL
             GROUP BY model
             ORDER BY tokens DESC
             LIMIT ?2",
        )
        .ok();
    let mut out = Vec::new();
    if let Some(mut s) = stmt {
        let rows = s.query_map(params![now - days * DAY_SECS, limit], |r| {
            Ok(ModelRow {
                model: r.get(0)?,
                tokens: r.get(1)?,
                cost: r.get(2)?,
            })
        });
        if let Ok(rs) = rows {
            for row in rs.flatten() {
                out.push(row);
            }
        }
    }
    out
}

/// Live metrics from the Hermes state.db, matching the dashboard's logic.
#[tauri::command]
fn get_hermes_metrics() -> Result<HermesMetrics, String> {
    let conn = open_db()?;
    let now = now_unix();

    // Most recent non-null model = "active model".
    let active_model: String = conn
        .query_row(
            "SELECT model FROM sessions WHERE model IS NOT NULL ORDER BY started_at DESC LIMIT 1",
            [],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "unknown".to_string());

    // GATEWAY DETECTION via process check — not DB timestamps.
    // The Hermes gateway is a live long-running process (Hermes.exe on Windows).
    // DB-based detection is unreliable: TUI sessions live for hours but start
    // timestamps age out of any freshness window; force-closed sessions leave
    // ended_at IS NULL ghosts. Process presence is the true "is it running"
    // signal — if Hermes.exe is in the process list, the gateway is up.
    // System::new_all() does a full one-shot refresh of all system info.
    let sys = System::new_all();

    let hermes_running = sys.processes().values().any(|p| {
        p.name()
            .to_string_lossy()
            .to_lowercase()
            .starts_with("hermes")
            && !p.name().to_string_lossy().contains("hermes-widget")
    });

    // Active gateways = distinct source platforms with a live (ended_at IS NULL)
    // session. This counts HOW MANY platforms are connected, while
    // hermes_running answers WHETHER the gateway exists at all.
    let active_gateways: i64 = conn
        .query_row(
            "SELECT COUNT(DISTINCT source) FROM sessions WHERE ended_at IS NULL",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    // "Connection active" = the Hermes gateway process is running.
    let is_connection_active: bool = hermes_running;

    Ok(HermesMetrics {
        active_model,
        is_connection_active,
        active_gateways,
        stats_7d: aggregate_range(&conn, 7.0, now),
        stats_30d: aggregate_range(&conn, 30.0, now),
        all_time: aggregate_range(&conn, 366.0 * 10.0, now),
        top_models_7d: top_models(&conn, 7.0, now, 4),
    })
}

/// Dynamically toggle the window's always-on-top state.
#[tauri::command]
fn toggle_always_on_top(window: tauri::Window, state: bool) -> std::result::Result<(), String> {
    window
        .set_always_on_top(state)
        .map_err(|e| format!("Failed to set always on top: {}", e))
}

/// Hide the main window.
#[tauri::command]
fn hide_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // ─── Kill Windows 11 DWM rounded corners ───────────────────
            // DWMWA_WINDOW_CORNER_PREFERENCE = 33, DWMWCP_DONOTROUND = 1
            // Requires `shadow: false` in tauri.conf.json — with shadow enabled
            // DWM applies an extended frame that forces rounded corners.
            #[cfg(target_os = "windows")]
            {
                use windows_sys::Win32::Graphics::Dwm::DwmSetWindowAttribute;
                if let Some(window) = app.get_webview_window("main") {
                    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
                    let hwnd_ptr = hwnd.0 as *mut core::ffi::c_void;
                    let preference: u32 = 1; // DWMWCP_DONOTROUND
                    let attr: u32 = 33; // DWMWA_WINDOW_CORNER_PREFERENCE
                    unsafe {
                        let _ = DwmSetWindowAttribute(
                            hwnd_ptr,
                            attr,
                            &preference as *const u32 as *const core::ffi::c_void,
                            core::mem::size_of::<u32>() as u32,
                        );
                    }
                }
            }

            // ─── Tray icon with dynamic Show/Hide label ────────────────
            let show_item = MenuItem::with_id(app, "show", "Hide Widget", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // Clone handles for each closure (MenuItem is Clone)
            let show_handle_menu = show_item.clone();
            let show_handle_tray = show_item.clone();

            let _tray = TrayIconBuilder::with_id("main")
                .icon(
                    tauri::image::Image::from_path("icons/icon.png")
                        .unwrap_or_else(|_| app.default_window_icon().unwrap().clone()),
                )
                .tooltip("Hermes Widget")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let now_visible = if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                                false
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                                true
                            };
                            let _ = show_handle_menu.set_text(if now_visible { "Hide Widget" } else { "Show Widget" });
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(move |tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let now_visible = if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                                false
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                                true
                            };
                            let _ = show_handle_tray.set_text(if now_visible { "Hide Widget" } else { "Show Widget" });
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_always_on_top,
            hide_window,
            get_hermes_metrics
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
