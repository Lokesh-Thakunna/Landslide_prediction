import { formatTimestamp } from "../lib/format";
import {
  getDashboardDictionary,
  getDashboardRiskLabel,
  type DashboardLanguage
} from "../lib/i18n";
import { riskTone } from "../lib/risk";
import type { AlertLog } from "../types";

interface AlertDispatchLogProps {
  language: DashboardLanguage;
  alerts: AlertLog[];
}

export function AlertDispatchLog({ language, alerts }: AlertDispatchLogProps) {
  const copy = getDashboardDictionary(language);

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_60px_rgba(17,32,22,0.08)] backdrop-blur">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{copy.alertDispatchLog}</h2>
        <p className="text-sm text-slate-600">
          {copy.alertDispatchSubtitle}
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-3 py-2">{copy.zone}</th>
              <th className="px-3 py-2">{copy.level}</th>
              <th className="px-3 py-2">{copy.channel}</th>
              <th className="px-3 py-2">{copy.status}</th>
              <th className="px-3 py-2">{copy.recipients}</th>
              <th className="px-3 py-2">{copy.timestamp}</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id} className="border-t border-slate-200 text-slate-700">
                <td className="px-3 py-3 font-medium text-slate-900">{alert.zone_name}</td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskTone(alert.risk_level)}`}
                  >
                    {getDashboardRiskLabel(language, alert.risk_level)}
                  </span>
                </td>
                <td className="px-3 py-3">{alert.channels.join(", ")}</td>
                <td className="px-3 py-3">{alert.delivery_status}</td>
                <td className="px-3 py-3">{alert.recipient_count}</td>
                <td className="px-3 py-3">{formatTimestamp(alert.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
