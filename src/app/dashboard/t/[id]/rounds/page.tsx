import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { gamePoints } from "@/lib/chess-types";
import { requireUser } from "@/lib/auth";
import { displayName, fmtPoints } from "@/lib/names";
import { getOwnedTournament, loadEventData } from "@/lib/tournaments";
import { BoardCard } from "./BoardCard";
import { RoundControls } from "./RoundControls";
import { RequestsPanel } from "./RequestsPanel";

export default async function Rounds({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ round?: string }> }) {
  const { id } = await params;
  const { round } = await searchParams;
  const user = await requireUser();
  const tour = await getOwnedTournament(id, user.id);
  const data = await loadEventData(tour.id);
  const t = await getTranslations("rounds");

  const selected = Math.min(Math.max(Number(round) || data.currentRound, 0), data.currentRound);
  const last = data.rounds[data.rounds.length - 1];
  const nextRound = data.currentRound + 1;
  const canPair = (!last || last.status === "finished") && (!tour.rounds || nextRound <= tour.rounds);
  const roundGames = data.games.filter((g) => g.round === selected);
  const canUnpair = !!last && selected === last.number && !data.games.some((g) => g.round === last.number && g.kind === "game" && g.result);

  // Points before the selected round, shown next to each name.
  const pointsBefore = new Map<string, number>();
  for (const g of data.games.filter((x) => x.round < selected)) {
    const [w, b] = gamePoints(g.kind, g.result);
    pointsBefore.set(g.whiteId, (pointsBefore.get(g.whiteId) ?? 0) + w);
    if (g.blackId) pointsBefore.set(g.blackId, (pointsBefore.get(g.blackId) ?? 0) + b);
  }
  const byId = new Map(data.players.map((p) => [p.id, p]));
  const side = (pid: string) => {
    const p = byId.get(pid)!;
    return { name: displayName(p), rating: p.rating, points: fmtPoints(pointsBefore.get(pid) ?? 0), rank: p.startRank };
  };
  const gamesOnly = roundGames.filter((g) => g.kind === "game");
  const done = gamesOnly.filter((g) => g.result).length;

  return (
    <div className="space-y-5">
      <RequestsPanel tournamentId={tour.id} players={byId} />
      {data.rounds.length > 0 && (
        <nav className="flex flex-wrap gap-2" aria-label={t("title", { n: "" })}>
          {data.rounds.map((r) => (
            <Link
              key={r.number}
              href={`?round=${r.number}`}
              aria-current={r.number === selected ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${
                r.number === selected ? "border-accent bg-accent/15 text-ink" : r.status === "finished" ? "border-ok/40 text-ok" : "border-line text-muted"
              }`}
            >
              {r.number}
            </Link>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {selected > 0 ? (
            <>
              <h2 className="text-lg font-semibold">{t("title", { n: selected })}</h2>
              <p className="text-sm text-muted">{t("progress", { done, total: gamesOnly.length })}</p>
            </>
          ) : (
            <p className="text-muted">{t("none")}</p>
          )}
          {!canPair && tour.rounds && data.currentRound >= tour.rounds && (
            <p className="text-sm text-ok">{tour.status === "finished" ? t("finished") : t("allPaired", { n: tour.rounds })}</p>
          )}
        </div>
        <RoundControls tournamentId={tour.id} nextRound={nextRound} canPair={canPair && selected === data.currentRound} canUnpair={canUnpair} lastRound={last?.number ?? 0} />
      </div>

      {roundGames.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roundGames.map((g) => (
            <BoardCard
              key={g.id}
              tournamentId={tour.id}
              gameId={g.id}
              board={g.board}
              kind={g.kind}
              result={g.result}
              white={side(g.whiteId)}
              black={g.blackId ? side(g.blackId) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
