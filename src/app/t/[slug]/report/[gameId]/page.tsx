import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { games, players, resultRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { resultLabel } from "@/lib/chess-types";
import { displayName } from "@/lib/names";
import { getTournamentBySlug } from "@/lib/tournaments";
import { submitRequest } from "@/app/request-actions";
import { ReportForm } from "./ReportForm";

export default async function ReportResult({ params }: { params: Promise<{ slug: string; gameId: string }> }) {
  const { slug, gameId } = await params;
  const tour = await getTournamentBySlug(slug);
  if (!/^[0-9a-f-]{36}$/i.test(gameId)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/t/${slug}/report/${gameId}`)}`);
  const [g] = await db.select().from(games).where(and(eq(games.id, gameId), eq(games.tournamentId, tour.id)));
  if (!g || g.kind !== "game" || !g.blackId) notFound();
  const [w] = await db.select().from(players).where(eq(players.id, g.whiteId));
  const [b] = await db.select().from(players).where(eq(players.id, g.blackId));
  const [mine] = await db
    .select()
    .from(resultRequests)
    .where(and(eq(resultRequests.gameId, g.id), eq(resultRequests.userId, user.id)))
    .orderBy(desc(resultRequests.createdAt))
    .limit(1);
  const t = await getTranslations("requests");
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={`/t/${slug}?round=${g.round}`} className="text-sm text-muted hover:text-ink">← {tour.name}</Link>
      <header>
        <h1 className="text-2xl font-bold">{t("reportTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("reportHint")}</p>
      </header>
      <div className="card p-4 text-sm">
        <p className="text-muted">{t("gameLine", { round: g.round, board: g.board })}</p>
        <p className="mt-1 font-medium">
          {displayName(w)} – {displayName(b)}
        </p>
        <p className="mt-1">
          {t("currentResult")}: <span className="font-semibold">{resultLabel(g.kind, g.result) || t("noResult")}</span>
        </p>
      </div>
      {mine && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${mine.status === "pending" ? "border-warn/50 text-warn" : mine.status === "approved" ? "border-ok/50 text-ok" : "border-bad/50 text-bad"}`}>
          {t(`yourStatus.${mine.status}`, { result: resultLabel("game", mine.proposedResult) })}
          {mine.response && <span className="block text-muted">{mine.response}</span>}
        </p>
      )}
      <ReportForm action={submitRequest.bind(null, slug, g.id)} current={g.result} />
      <Link href="/requests" className="block text-center text-sm text-accent hover:underline">{t("mine")}</Link>
    </div>
  );
}
