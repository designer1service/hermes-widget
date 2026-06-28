import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";
import {
  IconSun,
  IconMoon,
  IconPinFilled,
  IconPinOutline,
  IconChevronDown,
  IconChevronUp,
  IconClose,
} from "@/components/Icons";
import fingerprintBg from "@/assets/fingerprint-bg.jpg";
import { useHermesData } from "@/hooks/useHermesData";
import CompactView from "@/components/CompactView";
import ExpandedView from "@/components/ExpandedView";
import type { ThemeMode } from "@/lib/theme";
import type { RangeTab } from "@/types/metrics";

// Window heights tuned for the WANTED UI layout.
// Compact: tabs + 2 stat cards + active-model pill + gateway line
// Expanded: compact + sess/api pills + top models list (4 rows)
const COMPACT_HEIGHT = 165;
const EXPANDED_HEIGHT = 330;

export default function Widget({
  theme,
  onThemeChange,
}: {
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
}) {
  const { metrics, isLoading, error } = useHermesData();
  const [collapsed, setCollapsed] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  // Lifted: tab state survives compact↔expanded toggling
  const [activeRange, setActiveRange] = useState<RangeTab>("30d");

  useEffect(() => {
    const win = getCurrentWindow();
    win
    .setSize(new LogicalSize(320, collapsed ? COMPACT_HEIGHT : EXPANDED_HEIGHT))
    .catch(() => {});
  }, [collapsed]);

  const handleTogglePin = async () => {
    const next = !alwaysOnTop;
    setAlwaysOnTop(next);
    try {
      await invoke("toggle_always_on_top", { state: next });
    } catch {
      setAlwaysOnTop(!next);
    }
  };

  const toggleTheme = () => onThemeChange(theme === "dark" ? "light" : "dark");

  return (
    <div
      data-tauri-drag-region
      className="relative w-full h-full flex flex-col overflow-hidden select-none"
      style={{
        background: "var(--bg-surface)",
      }}
    >
      {/* ─── Fingerprint texture overlay ─────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${fingerprintBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: theme === "dark" ? 0.12 : 0.30,
          mixBlendMode: theme === "dark" ? "screen" : "multiply",
          zIndex: 0,
        }}
      />
      {/* ─── Header — uppercase title + 4 controls ─────────────── */}
      <header
        data-tauri-drag-region
        className="relative flex items-center justify-between px-3 h-7 shrink-0"
        style={{ zIndex: 10 }}
      >
        <span
          data-tauri-drag-region
          className="text-[10px] font-bold tracking-[0.14em] uppercase"
          style={{ color: "var(--text-primary)" }}
        >
          Hermes Widget
        </span>

        <div className="flex items-center gap-0.5">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            className="p-1 hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            {theme === "dark" ? <IconSun size={12} /> : <IconMoon size={12} />}
          </button>
          {/* Pin */}
          <button
            onClick={handleTogglePin}
            title={alwaysOnTop ? "Unpin" : "Pin on top"}
            className="p-1 hover:bg-white/5 transition-colors"
            style={{ color: alwaysOnTop ? "var(--accent)" : "var(--text-secondary)" }}
          >
            {alwaysOnTop ? <IconPinFilled size={12} /> : <IconPinOutline size={12} />}
          </button>
          {/* Collapse */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand" : "Collapse"}
            className="p-1 hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            {collapsed ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
          </button>
          {/* Close (hide to tray) */}
          <button
            onClick={() => invoke("hide_window")}
            title="Hide to tray"
            className="p-1 hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <IconClose size={12} />
          </button>
        </div>
      </header>

      {/* ─── Body ──────────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col overflow-hidden px-3 pb-2 pt-0.5" style={{ zIndex: 10 }}>
        {isLoading && (
          <div
            className="flex items-center justify-center py-8 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Connecting…
          </div>
        )}

        {error && !isLoading && (
          <div
            className="rounded-xl px-3 py-2 text-xs text-center"
            style={{
              background: "color-mix(in srgb, var(--danger) 12%, transparent)",
              color: "var(--danger)",
              border: `1px solid var(--danger)`,
            }}
          >
            {error}
          </div>
        )}

        {metrics && !isLoading && (
          collapsed ? (
            <CompactView metrics={metrics} activeRange={activeRange} setActiveRange={setActiveRange} />
          ) : (
            <ExpandedView metrics={metrics} activeRange={activeRange} setActiveRange={setActiveRange} />
          )
        )}
      </div>
    </div>
  );
}
