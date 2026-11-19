import { getTranslations } from "next-intl/server";
import { fmtPoints } from "@/lib/names";
import { teamStandings } from "@/lib/team";
import type { loadEventData } from "@/lib/tournaments";

type EventData = Awaited<ReturnType<typeof loadEventData>>;

export async function TeamStandingsTable({ data, boards }: { data: EventData; boards: number }) {
  const t = await getTranslations("standings");
  const teamOf = new Map(data.players.map((p) => [p.id, p.teamId]));
  const rows = teamStandings(data.teams, data.matches, data.games, (id) => teamOf.get(id) ?? null, boards, data.roundsDone);
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">{t("rank")}</th>
            <th className="px-3 py-2 font-medium">{t("team")}</th>
            <th className="px-3 py-2 text-right font-medium" title={t("matchPoints")}>{t("mp")}</th>
            <th className="px-3 py-2 text-right font-medium" title={t("gamePoints")}>{t("gp")}</th>
            <th className="px-3 py-2 text-right font-medium" title={t("buchholz")}>BH</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team.id} className="border-b border-line/60 last:border-0">
              <td className="px-3 py-2 tabular-nums text-muted">{r.rank}</td>
              <td className="px-3 py-2 font-medium">{r.team.name}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.mp}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtPoints(r.gp)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted">{r.bh}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
