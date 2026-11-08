import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { getOwnedTournament } from "@/lib/tournaments";
import { importPlayers } from "../../../actions";
import { ImportForm } from "./ImportForm";

export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const tour = await getOwnedTournament(id, user.id);
  const t = await getTranslations("import");
  return (
    <div className="max-w-4xl">
      <h2 className="mb-4 text-lg font-semibold">{t("title")}</h2>
      <ImportForm action={importPlayers.bind(null, tour.id)} backHref={`/dashboard/t/${tour.id}`} />
    </div>
  );
}
