import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { players, teams } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnedTournament } from "@/lib/tournaments";
import { updatePlayer } from "../../../../actions";
import { AddPlayerForm } from "../../AddPlayerForm";

export default async function EditPlayer({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params;
  const user = await requireUser();
  const tour = await getOwnedTournament(id, user.id);
  if (!/^[0-9a-f-]{36}$/i.test(pid)) notFound();
  const [p] = await db.select().from(players).where(and(eq(players.id, pid), eq(players.tournamentId, tour.id)));
  if (!p) notFound();
  const teamList = tour.format === "team" ? await db.select().from(teams).where(eq(teams.tournamentId, tour.id)) : null;
  const [t, tg] = await Promise.all([getTranslations("common"), getTranslations("registration")]);
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={`/dashboard/t/${id}`} className="text-sm text-muted hover:text-ink">← {t("back")}</Link>
      {p.fideCheck === "ok" && (
        <p className="card p-4 text-sm">
          <span className="text-muted">{tg("fideRecord")}:</span> <span className="font-medium">{p.fideName}</span> ·{" "}
          {p.fideRating ?? tg("fideUnrated")}
        </p>
      )}
      {p.warningNote && (
        <p className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-warn">{tg("warnedWith")}: {p.warningNote}</p>
      )}
      <AddPlayerForm
        action={updatePlayer.bind(null, tour.id, p.id)}
        player={p}
        teams={teamList?.map((x) => x.name).sort()}
        teamName={teamList?.find((x) => x.id === p.teamId)?.name}
      />
    </div>
  );
}
