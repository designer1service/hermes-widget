/** Stat card — label + animated value, used by both Compact and Expanded views. */

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-2 py-1.5"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
      }}
    >
      <span
        className="text-[9px] font-bold uppercase tracking-[0.12em] text-center leading-tight"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      <span
        className="text-xl font-bold tracking-tight mt-0.5 leading-none"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}
