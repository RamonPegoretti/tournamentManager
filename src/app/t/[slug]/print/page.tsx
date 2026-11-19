import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resultLabel, gamePoints } from "@/lib/chess-types";
import { displayName, fmtPoints } from "@/lib/names";
import { computeStandings, formatTiebreak } from "@/lib/standings";
import { teamStandings } from "@/lib/team";
import { roundMatches } from "@/lib/team-view";
import type { TiebreakCode } from "@/lib/tiebreaks";
import { getTournamentBySlug, loadEventData } from "@/lib/tournaments";
import { PrintButton } from "./PrintButton";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string; round?: string }> };

export const metadata: Metadata = { robots: { index: false } };

/** Printer-friendly pairings or standings (Print → Save as PDF gives the PDF). */
export default async function PrintPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { view, round } = await searchParams;
  const tour = await getTournamentBySlug(slug);
  const data = await loadEventData(tour.id);
  const [t, ts, tr, tf] = await Promise.all([getTranslations("print"), getTranslations("standings"), getTranslations("rounds"), getTranslations("format")]);
  const standings = view === "standings";
  const selected = Math.min(Math.max(Number(round) || data.currentRound, 1), Math.max(data.currentRound, 1));
  const byId = new Map(data.players.map((p) => [p.id, p]));
  const before = new Map<string, number>();
  for (const g of data.games.filter((x) => x.round < selected)) {
    const [w, b] = gamePoints(g.kind, g.result);
    before.set(g.whiteId, (before.get(g.whiteId) ?? 0) + w);
    if (g.blackId) before.set(g.blackId, (before.get(g.blackId) ?? 0) + b);
  }
  const th = "border-b-2 border-black px-2 py-1 text-left";
  const td = "border-b border-neutral-300 px-2 py-1";
  const name = (id: string | null) => {
    const p = id ? byId.get(id) : null;
    return p ? `${displayName(p)}${p.rating ? ` (${p.rating})` : ""}` : "";
  };

  const pairingRows = (games: typeof data.games, boardFrom?: (i: number) => number) =>
    games.map((g, i) => (
      <tr key={g.id}>
        <td className={td}>{boardFrom ? boardFrom(i) : g.board}</td>
        <td className={td}>{name(g.whiteId)}</td>
        <td className={`${td} text-right tabular-nums`}>{fmtPoints(before.get(g.whiteId) ?? 0)}</td>
        <td className={`${td} text-center font-semibold`}>{resultLabel(g.kind, g.result) || "–"}</td>
        <td className={`${td} text-right tabular-nums`}>{g.blackId ? fmtPoints(before.get(g.blackId) ?? 0) : ""}</td>
        <td className={td}>{g.blackId ? name(g.blackId) : tr(`bye.${g.kind}`)}</td>
      </tr>
    ));
  const pairingHead = (
    <thead>
      <tr>
        <th className={th}>{t("board")}</th>
        <th className={th}>{t("white")}</th>
        <th className={`${th} text-right`}>{t("pts")}</th>
        <th className={`${th} text-center`}>{t("result")}</th>
        <th className={`${th} text-right`}>{t("pts")}</th>
        <th className={th}>{t("black")}</th>
      </tr>
    </thead>
  );

  let body: React.ReactNode;
  if (!standings) {
    body =
      data.currentRound === 0 ? (
        <p>{t("nothing")}</p>
      ) : tour.format === "team" ? (
        roundMatches(data, selected, tour.boardsPerTeam).map((m) => (
          <div key={m.match.id} className="mb-4 break-inside-avoid">
            <h3 className="font-semibold">
              {m.match.board}. {m.home} {m.away ? `${fmtPoints(m.score[0])} – ${fmtPoints(m.score[1])} ${m.away}` : `(${tr("teamBye")})`}
            </h3>
            {m.games.length > 0 && <table className="w-full text-sm">{pairingHead}<tbody>{pairingRows(m.games, (i) => i + 1)}</tbody></table>}
          </div>
        ))
      ) : (
        <table className="w-full text-sm">{pairingHead}<tbody>{pairingRows(data.games.filter((g) => g.round === selected))}</tbody></table>
      );
  } else if (tour.format === "team") {
    const teamOf = new Map(data.players.map((p) => [p.id, p.teamId]));
    const rows = teamStandings(data.teams, data.matches, data.games, (id) => teamOf.get(id) ?? null, tour.boardsPerTeam, data.roundsDone);
    body = (
      <table className="w-full text-sm">
        <thead><tr><th className={th}>#</th><th className={th}>{ts("team")}</th><th className={`${th} text-right`}>{ts("mp")}</th><th className={`${th} text-right`}>{ts("gp")}</th><th className={`${th} text-right`}>BH</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team.id}><td className={td}>{r.rank}</td><td className={td}>{r.team.name}</td><td className={`${td} text-right`}>{r.mp}</td><td className={`${td} text-right`}>{fmtPoints(r.gp)}</td><td className={`${td} text-right`}>{r.bh}</td></tr>
          ))}
        </tbody>
      </table>
    );
  } else {
    const tbs = tour.tiebreaks as TiebreakCode[];
    const rows = computeStandings(data.playerLites, data.gameLites, tbs, data.roundsDone);
    body = (
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>#</th><th className={th}>{ts("player")}</th><th className={`${th} text-right`}>{ts("rating")}</th><th className={th}>FED</th>
            <th className={`${th} text-right`}>{ts("points")}</th>
            {tbs.map((c) => <th key={c} className={`${th} text-right`}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.player.id}>
              <td className={td}>{r.rank}</td><td className={td}>{displayName(r.player)}</td><td className={`${td} text-right`}>{r.player.rating ?? ""}</td><td className={td}>{r.player.federation ?? ""}</td>
              <td className={`${td} text-right font-semibold`}>{fmtPoints(r.points)}</td>
              {tbs.map((c) => <td key={c} className={`${td} text-right`}>{formatTiebreak(r.tiebreaks[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 text-black print:max-w-none print:rounded-none print:p-0">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{tour.name}</h1>
          <p className="text-sm">{[tf(tour.format), tour.location, tour.startDate, tour.timeControl].filter(Boolean).join(" · ")}</p>
          <h2 className="mt-2 text-lg font-semibold">
            {standings ? (data.roundsDone ? ts("after", { n: data.roundsDone }) : t("nothing")) : t("pairingsRound", { n: selected })}
          </h2>
        </div>
        <PrintButton label={t("print")} />
      </div>
      {body}
    </div>
  );
}
