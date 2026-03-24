import type { RiskLevel } from "../types";

export const riskTheme: Record<
  RiskLevel,
  {
    badge: string;
    card: string;
  }
> = {
  SAFE: {
    badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
    card: "from-emerald-500/18 to-emerald-200/20"
  },
  WATCH: {
    badge: "bg-amber-100 text-amber-900 border-amber-300",
    card: "from-amber-500/18 to-orange-200/18"
  },
  DANGER: {
    badge: "bg-rose-100 text-rose-900 border-rose-300",
    card: "from-rose-600/22 to-orange-300/18"
  }
};
