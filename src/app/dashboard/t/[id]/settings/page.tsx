import { requireUser } from "@/lib/auth";
import { getOwnedTournament } from "@/lib/tournaments";
import { updateTournament } from "../../../actions";
import { TournamentForm } from "../../../TournamentForm";

export default async function Settings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const tour = await getOwnedTournament(id, user.id);
  return (
    <div className="max-w-3xl">
      <TournamentForm action={updateTournament.bind(null, id)} initial={tour} />
    </div>
  );
}
