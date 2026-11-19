import { getTranslations } from "next-intl/server";
import { StandingsTable } from "@/components/StandingsTable";
import { requireUser } from "@/lib/auth";
import { computeStandings } from "@/lib/standings";
import type { TiebreakCode } from "@/lib/tiebreaks";
import { getOwnedTournament, loadEventData } from "@/lib/tournaments";

export default async function Standings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const tour = await getOwnedTournament(id, user.id);
  const data = await loadEventData(tour.id);
  const t = await getTranslations("standings");
  if (data.roundsDone === 0) return <div className="card p-10 text-center text-muted">{t("none")}</div>;
  const rows = computeStandings(data.playerLites, data.gameLites, tour.tiebreaks as TiebreakCode[], data.roundsDone);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t("after", { n: data.roundsDone })}</p>
      <StandingsTable rows={rows} tiebreaks={tour.tiebreaks} />
    </div>
  );
}
