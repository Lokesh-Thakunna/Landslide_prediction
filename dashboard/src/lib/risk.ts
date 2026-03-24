import type { RiskLevel } from "../types";

export const RISK_COLORS: Record<RiskLevel, string> = {
  SAFE: "#2f855a",
  WATCH: "#d69e2e",
  DANGER: "#c53030",
};

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 70) {
    return "DANGER";
  }

  if (score >= 30) {
    return "WATCH";
  }

  return "SAFE";
}

export function riskTone(level: RiskLevel): string {
  switch (level) {
    case "SAFE":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "WATCH":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "DANGER":
      return "bg-rose-100 text-rose-900 border-rose-300";
  }
}

export function formatRiskCopy(level: RiskLevel): string {
  switch (level) {
    case "SAFE":
      return "Normal monitoring. Keep route and shelter references ready.";
    case "WATCH":
      return "Heightened attention. Field teams should prepare for rapid escalation.";
    case "DANGER":
      return "Immediate warning conditions. Move toward shelter guidance and verify routes.";
  }
}
