import { and, asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { games, resultRequests, user } from "@/db/schema";
import { ActionButton } from "@/components/ActionButton";
import { resultLabel } from "@/lib/chess-types";
import { displayName } from "@/lib/names";
import type { Player } from "@/db/schema";
import { approveRequest, denyRequest } from "@/app/request-actions";

/** Amber banner with the players' result-correction requests waiting for the organizer. */
export async function RequestsPanel({ tournamentId, players }: { tournamentId: string; players: Map<string, Player> }) {
  const rows = await db
    .select({ r: resultRequests, g: games, name: user.name, email: user.email })
    .from(resultRequests)
    .innerJoin(games, eq(resultRequests.gameId, games.id))
    .innerJoin(user, eq(resultRequests.userId, user.id))
    .where(and(eq(resultRequests.tournamentId, tournamentId), eq(resultRequests.status, "pending")))
    .orderBy(asc(resultRequests.createdAt));
  if (!rows.length) return null;
  const t = await getTranslations("requests");
  return (
    <section className="space-y-3 rounded-xl border border-warn/50 bg-warn/10 p-4">
      <h2 className="font-semibold text-warn">{t("waiting", { count: rows.length })}</h2>
      {rows.map(({ r, g, name, email }) => {
        const w = players.get(g.whiteId);
        const b = g.blackId ? players.get(g.blackId) : undefined;
        const party = [w, b].find((p) => p?.email && p.email.toLowerCase() === email.toLowerCase());
        const changed = g.result !== r.currentResult;
        return (
          <div key={r.id} className="card flex flex-wrap items-start gap-4 p-4 text-sm">
            <div className="min-w-0 flex-1">
              <p className="text-muted">{t("gameLine", { round: g.round, board: g.board })}</p>
              <p className="font-medium">
                {w ? displayName(w) : "?"} – {b ? displayName(b) : "?"}
              </p>
              <p className="mt-1">
                <span className="text-muted">{resultLabel("game", g.result) || t("noResult")}</span> →{" "}
                <span className="font-semibold text-warn">{resultLabel("game", r.proposedResult)}</span>
                {changed && <span className="ml-2 text-xs text-muted">({t("changedSince")})</span>}
              </p>
              {r.message && <p className="mt-1 whitespace-pre-line">“{r.message}”</p>}
              <p className="mt-1 text-xs text-muted">
                {t("from", { name, email })}
                {party && <span className="ml-1 text-ok">· {t("isPlayer", { player: displayName(party) })}</span>}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2">
              <ActionButton action={approveRequest.bind(null, tournamentId, r.id)} className="btn-primary">{t("approve")}</ActionButton>
              <details className="relative">
                <summary className="btn-ghost cursor-pointer list-none">{t("deny")}</summary>
                <form action={denyRequest.bind(null, tournamentId, r.id)} className="absolute right-0 z-10 mt-2 w-72 space-y-2 rounded-xl border border-line bg-surface-2 p-3 shadow-xl">
                  <textarea name="response" rows={2} className="input" placeholder={t("responsePlaceholder")} />
                  <button className="btn-danger w-full">{t("confirmDeny")}</button>
                </form>
              </details>
            </div>
          </div>
        );
      })}
    </section>
  );
}
