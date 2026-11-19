import { getTranslations } from "next-intl/server";
import { slotWinner } from "@/lib/knockout";
import { resultLabel } from "@/lib/chess-types";
import { displayName } from "@/lib/names";
import type { loadEventData } from "@/lib/tournaments";

type EventData = Awaited<ReturnType<typeof loadEventData>>;

/** Knockout bracket: one column per round, slots in bracket order. */
export async function Bracket({ data, totalRounds }: { data: EventData; totalRounds: number }) {
  const t = await getTranslations("standings");
  const byId = new Map(data.players.map((p) => [p.id, p]));
  const rankOf = (id: string | null) => (id ? (byId.get(id)?.startRank ?? 0) : null);
  const columns = Array.from({ length: totalRounds }, (_, r) => {
    const round = r + 1;
    const size = 2 ** (totalRounds - r - 1);
    return { round, slots: Array.from({ length: size }, (_, i) => data.games.find((g) => g.round === round && g.board === i + 1) ?? null) };
  });
  const final = columns[columns.length - 1]?.slots[0];
  const champion = final ? slotWinner({ white: rankOf(final.whiteId)!, black: rankOf(final.blackId), result: final.result }) : undefined;
  const champ = champion ? data.players.find((p) => p.startRank === champion) : null;
  const label = (round: number) =>
    round === totalRounds ? t("final") : round === totalRounds - 1 ? t("semifinal") : round === totalRounds - 2 ? t("quarterfinal") : t("roundN", { n: round });

  return (
    <div className="space-y-4">
      {champ && (
        <p className="rounded-xl border border-ok/50 bg-ok/10 p-4 text-center">
          <span className="block text-xs uppercase tracking-wide text-ok">{t("winner")}</span>
          <span className="text-xl font-bold">{displayName(champ)}</span>
        </p>
      )}
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {columns.map((c) => (
            <div key={c.round} className="flex w-56 flex-col">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">{label(c.round)}</p>
              <div className="flex flex-1 flex-col justify-around gap-2">
                {c.slots.map((g, i) => {
                  if (!g) return <div key={i} className="card border-dashed p-2 text-xs text-muted">—</div>;
                  const w = slotWinner({ white: rankOf(g.whiteId)!, black: rankOf(g.blackId), result: g.result });
                  const row = (id: string | null) => {
                    const p = id ? byId.get(id) : null;
                    const won = p && w !== undefined && w === p.startRank;
                    return (
                      <p className={`flex justify-between gap-2 truncate ${won ? "font-semibold text-ok" : w !== undefined ? "text-muted" : ""}`}>
                        <span className="truncate">{p ? `${p.startRank}. ${displayName(p)}` : t("bye")}</span>
                      </p>
                    );
                  };
                  return (
                    <div key={i} className="card p-2 text-sm">
                      {row(g.whiteId)}
                      {g.blackId ? row(g.blackId) : <p className="text-xs text-muted">{t("bye")}</p>}
                      {g.result && <p className="mt-1 text-right text-xs text-muted tabular-nums">{resultLabel(g.kind, g.result)}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
