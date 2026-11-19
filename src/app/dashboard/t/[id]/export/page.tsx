import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { getOwnedTournament, loadEventData } from "@/lib/tournaments";

export default async function Export({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const tour = await getOwnedTournament(id, user.id);
  const data = await loadEventData(tour.id);
  const t = await getTranslations("export");
  const file = (name: string, label: string, hint: string, disabled = false) => (
    <a
      href={disabled ? undefined : `/dashboard/t/${id}/export/${name}`}
      aria-disabled={disabled}
      className={`card block p-4 ${disabled ? "pointer-events-none opacity-50" : "hover:border-accent"}`}
    >
      <p className="font-semibold">{label}</p>
      <p className="text-sm text-muted">{hint}</p>
    </a>
  );
  const print = (query: string, label: string, hint: string, disabled = false) => (
    <a
      href={disabled ? undefined : `/t/${tour.slug}/print?${query}`}
      target="_blank"
      aria-disabled={disabled}
      className={`card block p-4 ${disabled ? "pointer-events-none opacity-50" : "hover:border-accent"}`}
    >
      <p className="font-semibold">{label} ↗</p>
      <p className="text-sm text-muted">{hint}</p>
    </a>
  );
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 font-semibold">{t("printTitle")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {print(`view=pairings&round=${data.currentRound}`, t("printPairings", { n: data.currentRound || 1 }), t("printHint"), data.currentRound === 0)}
          {print("view=standings", t("printStandings"), t("printHint"), data.roundsDone === 0)}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">{t("filesTitle")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {file("players.csv", t("playersCsv"), t("playersCsvHint"))}
          {file("pairings.csv", t("pairingsCsv"), t("pairingsCsvHint"), data.games.length === 0)}
          {file("standings.csv", t("standingsCsv"), t("standingsCsvHint"), data.roundsDone === 0)}
          {file("report.trf", t("trf"), t("trfHint"), data.roundsDone === 0)}
        </div>
      </section>
    </div>
  );
}
