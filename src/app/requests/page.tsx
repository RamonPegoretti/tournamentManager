import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { games, resultRequests, tournaments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { resultLabel } from "@/lib/chess-types";

const TONE = { pending: "border-warn/50 text-warn", approved: "border-ok/50 text-ok", denied: "border-bad/50 text-bad" } as const;

export default async function MyRequests() {
  const user = await requireUser();
  const rows = await db
    .select({ r: resultRequests, tName: tournaments.name, slug: tournaments.slug, round: games.round, board: games.board })
    .from(resultRequests)
    .innerJoin(tournaments, eq(resultRequests.tournamentId, tournaments.id))
    .innerJoin(games, eq(resultRequests.gameId, games.id))
    .where(eq(resultRequests.userId, user.id))
    .orderBy(desc(resultRequests.createdAt));
  const t = await getTranslations("requests");
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t("mine")}</h1>
      {rows.length === 0 ? (
        <div className="card p-8 text-center text-muted">{t("noneMine")}</div>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ r, tName, slug, round, board }) => (
            <li key={r.id} className="card flex flex-wrap items-center gap-3 p-4 text-sm">
              <div className="mr-auto">
                <Link href={`/t/${slug}?round=${round}`} className="font-medium hover:underline">{tName}</Link>
                <p className="text-muted">
                  {t("gameLine", { round, board })} · {resultLabel("game", r.currentResult) || t("noResult")} → {resultLabel("game", r.proposedResult)}
                </p>
                {r.response && <p className="mt-1 text-muted">“{r.response}”</p>}
              </div>
              <span className={`chip ${TONE[r.status]}`}>{t(`status.${r.status}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
