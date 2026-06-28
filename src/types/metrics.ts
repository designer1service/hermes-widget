export type RangeTab = "7d" | "30d" | "all";

export const RANGE_TABS: { id: RangeTab; label: string }[] = [
  { id: "7d", label: "7 DAYS" },
  { id: "30d", label: "30 DAYS" },
  { id: "all", label: "TOTAL" },
];

/** Human-readable label for the currently selected range, used in "Spent · X" labels. */
export function rangeLabelOf(tab: RangeTab): string {
  return tab === "all" ? "ALL" : tab === "30d" ? "30 DAYS" : "7 DAYS";
}

export interface RangeStats {
  sessions: number;
  apiCalls: number;
  inputTokens: number;
  outputTokens: number;
  spent: number; // USD
}

export interface ModelRow {
  model: string;
  tokens: number;
  cost: number; // USD
}

export interface HermesMetrics {
  activeModel: string;
  isConnectionActive: boolean;
  activeGateways: number;
  stats7d: RangeStats;
  stats30d: RangeStats;
  allTime: RangeStats;
  topModels7d: ModelRow[];
}

/** Selects the stats object for the active range tab from the metrics payload. */
export function selectRange(metrics: HermesMetrics, tab: RangeTab): RangeStats {
  return tab === "7d" ? metrics.stats7d : tab === "30d" ? metrics.stats30d : metrics.allTime;
}
