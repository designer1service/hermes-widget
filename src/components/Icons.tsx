// HUD-style angular icons — no rounded corners, no curves.
// All icons take a `size` prop and use currentColor for stroke.

interface IconProps {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 14 14",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
});

// ─── Sun (for "switch to light" when in dark mode) ────────────
// Diamond center with radiating ticks — angular, not round
export function IconSun({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="5" y="5" width="4" height="4" />
      <line x1="7" y1="1" x2="7" y2="3" />
      <line x1="7" y1="11" x2="7" y2="13" />
      <line x1="1" y1="7" x2="3" y2="7" />
      <line x1="11" y1="7" x2="13" y2="7" />
      <line x1="2.5" y1="2.5" x2="3.8" y2="3.8" />
      <line x1="10.2" y1="10.2" x2="11.5" y2="11.5" />
      <line x1="10.2" y1="3.8" x2="11.5" y2="2.5" />
      <line x1="2.5" y1="11.5" x2="3.8" y2="10.2" />
    </svg>
  );
}

// ─── Moon (for "switch to dark" when in light mode) ────────────
// Crescent as two angular arcs — sharp, not round
export function IconMoon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M 11 2 L 11 12 L 5 12 L 5 2 Z" opacity="0.4" />
      <path d="M 11 2 L 11 12 L 8 12 L 8 2 Z" />
    </svg>
  );
}

// ─── Pin (active = always on top) ─────────────────────────────
// Filled diamond when pinned, outline diamond when not
export function IconPinFilled({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="4" y="4" width="6" height="6" fill="currentColor" />
      <line x1="7" y1="10" x2="7" y2="13" />
    </svg>
  );
}

export function IconPinOutline({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="4" y="4" width="6" height="6" />
      <line x1="7" y1="10" x2="7" y2="13" />
    </svg>
  );
}

// ─── Close (hide to tray) ─────────────────────────────────────
// Sharp X mark
export function IconClose({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <line x1="3" y1="3" x2="11" y2="11" />
      <line x1="11" y1="3" x2="3" y2="11" />
    </svg>
  );
}

// ─── Collapse / Expand chevrons ───────────────────────────────
// Sharp V-shape, not the rounded lucide version
export function IconChevronDown({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M 3 5 L 7 10 L 11 5" />
    </svg>
  );
}

export function IconChevronUp({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M 3 10 L 7 5 L 11 10" />
    </svg>
  );
}
