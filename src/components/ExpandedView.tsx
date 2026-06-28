import {
  RANGE_TABS,
  rangeLabelOf,
  selectRange,
  type HermesMetrics,
  type ModelRow,
  type RangeTab,
} from "@/types/metrics";
import { useCounter } from "@/hooks/useCounter";
import { formatNum, formatTokens, formatUsd } from "@/lib/format";
import { StatCard } from "@/components/StatCard";
import { GatewayIndicator } from "@/components/CompactView";

export default function ExpandedView({
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

  // Animated counters — must be called unconditionally (hook rules)
  const spentDisplay = useCounter(s.spent, formatUsd);
  const tokensDisplay = useCounter(s.inputTokens, formatTokens);
  const sessDisplay = useCounter(s.sessions, formatNum);
  const apiDisplay = useCounter(s.apiCalls, formatNum);

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

      {/* ─── Active Model pill (line separator) ────────────────── */}
      <SeparatorPill label="Active Model" value={metrics.activeModel.toUpperCase()} />

      {/* ─── SESS + API pills (side by side) ───────────────────── */}
      <div className="grid grid-cols-2 gap-1.5">
        <SeparatorPill label="SESS" value={sessDisplay} />
        <SeparatorPill label="API" value={apiDisplay} />
      </div>

      {/* ─── Top models list ───────────────────────────────────── */}
      {metrics.topModels7d.length > 0 && (
        <div className="flex flex-col gap-0.5 w-full">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-center" style={{ color: "var(--text-primary)" }}>
            Top Models · Last 7 Days
          </span>
          <div className="flex flex-col gap-0.5 w-full">
            {metrics.topModels7d.map((m) => (
              <ModelRowItem key={m.model} model={m.model} tokens={m.tokens} cost={m.cost} />
            ))}
          </div>
        </div>
      )}

      <GatewayIndicator connected={gatewayConnected} />
    </div>
  );
}

function ModelRowItem({ model, tokens, cost }: ModelRow) {
  const tokenDisplay = useCounter(tokens, formatTokens);
  const costDisplay = useCounter(cost, formatUsd);
  return (
    <div
      className="flex items-center gap-2 px-2 py-1 w-full"
      style={{
        background: "var(--card-bg)",
        border: `1px solid var(--border-soft)`,
      }}
    >
      <span className="text-[10px] font-bold shrink-0" style={{ color: "var(--text-primary)" }}>
        {model.toUpperCase()}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--border-soft)" }} />
      <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color: "var(--text-secondary)" }}>
        {tokenDisplay}
      </span>
      <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color: "var(--text-muted)" }}>
        - {costDisplay}
      </span>
    </div>
  );
}

function SeparatorPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1"
      style={{
        background: "var(--card-bg)",
        border: `1px solid var(--border-soft)`,
      }}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.12em] shrink-0" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <div className="flex-1 h-px min-w-[8px]" style={{ background: "var(--border-soft)" }} />
      <span className="text-[10px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}
