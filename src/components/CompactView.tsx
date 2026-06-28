import {
  RANGE_TABS,
  rangeLabelOf,
  selectRange,
  type HermesMetrics,
  type RangeTab,
} from "@/types/metrics";
import { useCounter } from "@/hooks/useCounter";
import { formatTokens, formatUsd } from "@/lib/format";
import { StatCard } from "@/components/StatCard";

export default function CompactView({
  metrics,
  activeRange,
  setActiveRange,
}: {
  metrics: HermesMetrics;
  activeRange: RangeTab;
  setActiveRange: (t: RangeTab) => void;
}) {
  const s = selectRange(metrics, activeRange);
  const rangeLabel = rangeLabelOf(activeRange);
  const gatewayConnected = metrics.activeGateways > 0;

  const spentDisplay = useCounter(s.spent, formatUsd);
  const tokensDisplay = useCounter(s.inputTokens, formatTokens);

  return (
    <div className="flex flex-col gap-1.5">
      {/* ─── Pill tabs row ──────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {RANGE_TABS.map((t) => {
          const active = activeRange === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveRange(t.id)}
              className="flex-1 text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 transition-colors"
              style={{
                background: active ? "var(--tab-active-bg)" : "var(--tab-inactive-bg)",
                color: active ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
                border: `1px solid ${active ? "var(--tab-active-bg)" : "var(--tab-border)"}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── Two big stat cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-1.5">
        <StatCard label={`Spent · ${rangeLabel}`} value={spentDisplay} />
        <StatCard label="Tokens Spent" value={tokensDisplay} />
      </div>

      {/* ─── Active Model pill (with line separator) */}
      <div
        className="flex items-center gap-2 px-2 py-1"
        style={{
          background: "var(--card-bg)",
          border: `1px solid var(--border-soft)`,
        }}
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] shrink-0" style={{ color: "var(--text-muted)" }}>
          Active Model
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border-soft)" }} />
        <span className="text-[10px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
          {metrics.activeModel.toUpperCase()}
        </span>
      </div>

      {/* ─── Gateway status line ───────────────────────────────── */}
      <GatewayIndicator connected={gatewayConnected} />
    </div>
  );
}

/** Shared gateway status indicator — used by both views. Exported for reuse in ExpandedView. */
export function GatewayIndicator({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-auto">
      <span
        className="inline-block w-1.5 h-1.5 shrink-0"
        style={{
          background: connected ? "var(--text-primary)" : "var(--text-muted)",
          animation: connected ? "pulse 1.5s cubic-bezier(0, 0, 1, 1) infinite" : "none",
        }}
      />
      <span className="text-[9px] font-medium uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
        {connected ? "Gateway Connected" : "Gateway Disconnected"}
      </span>
    </div>
  );
}
