import { getTranslations } from "next-intl/server";
import { fmtPoints, displayName } from "@/lib/names";
import { formatTiebreak, type StandingRow } from "@/lib/standings";

export async function StandingsTable({ rows, tiebreaks, compact = false }: { rows: StandingRow[]; tiebreaks: string[]; compact?: boolean }) {
  const [t, tb] = await Promise.all([getTranslations("standings"), getTranslations("tiebreak")]);
  const shown = compact ? tiebreaks.slice(0, 2) : tiebreaks;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">{t("rank")}</th>
            <th className="px-3 py-2 font-medium">{t("player")}</th>
            {!compact && <th className="px-3 py-2 text-right font-medium">{t("rating")}</th>}
            <th className="px-3 py-2 text-right font-medium">{t("points")}</th>
            {shown.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-2 text-right font-medium" title={tb(c)}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.player.id} className={`border-b border-line/60 last:border-0 ${r.player.status === "withdrawn" ? "text-muted" : ""}`}>
              <td className="px-3 py-2 tabular-nums text-muted">{r.rank}</td>
              <td className="px-3 py-2">
                <span className="font-medium">{displayName(r.player)}</span>
                {r.player.federation && <span className="ml-2 text-xs text-muted">{r.player.federation}</span>}
                {compact && r.player.rating && <span className="ml-2 text-xs text-muted tabular-nums">{r.player.rating}</span>}
              </td>
              {!compact && <td className="px-3 py-2 text-right tabular-nums text-muted">{r.player.rating ?? "—"}</td>}
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmtPoints(r.points)}</td>
              {shown.map((c) => (
                <td key={c} className="px-3 py-2 text-right tabular-nums text-muted">
                  {formatTiebreak(r.tiebreaks[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
