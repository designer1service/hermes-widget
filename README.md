# Hermes Widget

A frameless system-tray desktop widget for monitoring a local [Hermes AI agent](https://hermes-agent.nousresearch.com) instance. Shows live model, spend, token usage, and gateway status in a compact panel that reads directly from the Hermes state database.

Built with Tauri v2 (Rust backend) and React 18 (TypeScript frontend). The UI follows a diegetic HUD aesthetic: monospace typography, pure black background, monochrome palette, zero rounded corners, sharp angular icons.

---

## Features

- **Live metrics**: active model, 7d / 30d / all-time spend, token usage, sessions, API calls, top models.
- **Gateway status**: indicator driven by live Hermes process detection via `sysinfo`, not DB timestamps.
- **Compact and Expanded views**: collapsible UI. Compact shows essentials, Expanded adds the top models list and SESS / API pills.
- **Dark and Light themes**: full color inversion, persisted in `localStorage`.
- **System tray residency**: hidden from the taskbar. Left-click the tray icon to toggle visibility.
- **Pin on top**: one-click pushpin to keep the widget floating above all windows.
- **Auto-refresh**: polls the Hermes DB every 5 seconds.
- **Animated counters**: values tween between updates for a live-data feel.
- **Small footprint**: native Rust backend, approximately 10 MB bundle.

---

## Tech Stack

| Layer    | Tech                                          |
| -------- | --------------------------------------------- |
| Backend  | Tauri v2, Rust 2021, rusqlite, sysinfo        |
| Frontend | React 18, TypeScript 5, Vite 6                |
| Styling  | TailwindCSS 3, custom inline SVG icon set     |

No Electron. No icon library dependency. All icons are hand-written angular SVGs in `src/components/Icons.tsx`.

---

## How it works

The widget reads directly from the Hermes state database at `%LOCALAPPDATA%\hermes\state.db`. No HTTP API is required.

- **Spend, tokens, sessions, API calls**: aggregated from the `sessions` table via SQL `SUM` / `COUNT` over a time window (7d, 30d, all-time).
- **Active model**: the model name from the most recent session.
- **Gateway status**: checks whether a `Hermes.exe` (or platform equivalent) process is running via the `sysinfo` crate. This is more reliable than DB timestamps, which leave ghost sessions when TUI or cron processes are force-closed.
- **Top models**: the top 4 models by total tokens in the last 7 days.

The query is a single IPC round-trip (`get_hermes_metrics`) that returns the full payload. The frontend switches between 7d / 30d / all-time client-side by selecting from the cached payload, so switching tabs does not trigger another IPC call.

Polling interval: 5 seconds (`src/hooks/useHermesData.ts`).

---

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **Rust** >= 1.77.2, installed via [rustup](https://rustup.rs/)
- **Tauri v2 system dependencies**: see the [official guide](https://v2.tauri.app/start/prerequisites/)
  - **Windows**: Microsoft Visual Studio C++ Build Tools + WebView2
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `webkit2gtk`, `libayatana-appindicator3-dev`, and related packages

### Install and run locally

```bash
git clone https://github.com/your-username/hermes-widget.git
cd hermes-widget
npm install
npm run tauri:dev
```

The first Rust build takes 3 to 5 minutes while dependencies compile. Subsequent runs are fast.

### Production build

```bash
npm run tauri:build
```

Output in `src-tauri/target/release/bundle/`:

- **Windows**: `.msi` installer + NSIS `.exe`
- **macOS**: `.dmg` + `.app`
- **Linux**: `.deb`, `.AppImage`, `.rpm`

The raw executable is at `src-tauri/target/release/hermes-widget[.exe]`.

---

## Project Structure

```
hermes-widget/
├── src/
│   ├── components/
│   │   ├── Widget.tsx          # Shell: header, theme/pin/collapse/close controls, view switch
│   │   ├── CompactView.tsx     # Collapsed layout + shared GatewayIndicator
│   │   ├── ExpandedView.tsx    # Full layout: stat cards, SESS/API pills, top models
│   │   ├── StatCard.tsx        # Shared stat card (label + value)
│   │   └── Icons.tsx           # Custom angular SVG icon set
│   ├── hooks/
│   │   ├── useHermesData.ts    # 5s polling of get_hermes_metrics
│   │   └── useCounter.ts       # Animated number tween (requestAnimationFrame)
│   ├── lib/
│   │   ├── theme.ts            # Light/dark toggle, persisted in localStorage
│   │   └── format.ts           # Shared value formatters (USD, tokens, plain numbers)
│   ├── types/
│   │   └── metrics.ts          # HermesMetrics, RangeStats, ModelRow, RangeTab, helpers
│   ├── assets/
│   │   └── fingerprint-bg.jpg  # Subtle texture overlay
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css              # Design tokens (dark default + light override)
│   └── assets.d.ts             # TypeScript declarations for image imports
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs              # IPC commands, DB queries, tray, gateway detection
│   │   ├── main.rs             # Binary entry point
│   │   └── build.rs            # tauri_build
│   ├── capabilities/
│   │   └── default.json        # Tauri v2 permission scope
│   ├── icons/                  # Tray + bundle icons
│   ├── tauri.conf.json         # Window config, bundle targets
│   ├── Cargo.toml
│   └── build.rs
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Configuration

Window dimensions and behavior live in `src-tauri/tauri.conf.json`:

| Key           | Default | Description                                |
| ------------- | ------- | ------------------------------------------ |
| `width`       | 320     | Widget width (fixed)                       |
| `height`      | 380     | Expanded height                            |
| `minHeight`   | 190     | Compact height (enforced via `LogicalSize`) |
| `transparent` | false   | Solid background (Windows-safe)            |
| `decorations` | false   | Frameless (no OS title bar)                |
| `skipTaskbar` | true    | Hidden from the main taskbar               |
| `resizable`   | false   | Fixed size                                 |
| `shadow`      | false   | Disabled to allow sharp 0px corners on Win11 |

The compact and expanded heights are also defined as constants in `src/components/Widget.tsx` (`COMPACT_HEIGHT`, `EXPANDED_HEIGHT`) and applied at runtime via `LogicalSize`. All three locations must stay in sync when resizing.

Theme tokens (colors, borders) are in `src/styles.css` under `:root` (dark, the default) and `:root.light` (light override).

### Sharp corners on Windows 11

Windows 11 DWM applies rounded corners to frameless windows by default. The widget disables them via `shadow: false` in `tauri.conf.json` combined with a `DwmSetWindowAttribute` call in `src-tauri/src/lib.rs` (attribute 33, value 1). Both are required; either alone fails.

---

## IPC Commands

The Rust backend exposes three commands:

| Command              | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `get_hermes_metrics` | Returns the full metrics payload (single round-trip) |
| `toggle_always_on_top` | Toggles the window's always-on-top state           |
| `hide_window`        | Hides the window to the tray (used by the X button)  |

The tray right-click menu provides Show / Hide and Quit. Left-clicking the tray icon toggles visibility.

---

## Contributing

1. Fork the repo and create a feature branch.
2. Run `npm run tauri:dev` to verify your changes.
3. Open a Pull Request with a clear description.

---

## License

Released under the MIT License. See [LICENSE](LICENSE).
