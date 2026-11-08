import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { createTournament } from "../actions";
import { TournamentForm } from "../TournamentForm";

export default async function NewTournament() {
  await requireUser();
  const t = await getTranslations("setup");
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <TournamentForm action={createTournament} />
    </div>
  );
}
