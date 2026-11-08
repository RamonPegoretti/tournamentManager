import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { playerFlags } from "@/lib/flags";
import { getOwnedTournament, listPlayers } from "@/lib/tournaments";
import { addPlayer, removePlayer } from "../../actions";
import { AddPlayerForm } from "./AddPlayerForm";
import { RemovePlayerButton } from "./RemovePlayerButton";

export default async function Players({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ imported?: string }>;
}) {
  const { id } = await params;
  const { imported } = await searchParams;
  const user = await requireUser();
  const tour = await getOwnedTournament(id, user.id);
  const players = await listPlayers(tour.id);
  const flags = playerFlags(players);
  const [t, tp, ti] = await Promise.all([getTranslations("tournament"), getTranslations("player"), getTranslations("import")]);
  const rated = players.filter((p) => p.rating !== null);
  const avg = rated.length ? Math.round(rated.reduce((s, p) => s + p.rating!, 0) / rated.length) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section>
        {imported && (
          <p className="mb-4 rounded-lg border border-ok/40 bg-ok/10 px-4 py-2 text-sm text-ok">{ti("done", { count: Number(imported) || 0 })}</p>
        )}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {t("count", { count: players.length })}
            {rated.length > 0 && ` · ${t("rated", { count: rated.length })} · ${t("averageRating", { value: avg! })}`}
          </p>
          <Link href={`/dashboard/t/${id}/import`} className="btn-ghost">{t("import")}</Link>
        </div>
        {players.length === 0 ? (
          <div className="card p-10 text-center text-muted">{t("noPlayers")}</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">{t("player")}</th>
                  <th className="px-4 py-2 text-right font-medium">{tp("rating")}</th>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">{tp("fideId")}</th>
                  <th className="hidden px-4 py-2 font-medium md:table-cell">{tp("club")}</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  const name = [p.lastName, p.firstName].filter(Boolean).join(", ");
                  return (
                    <tr key={p.id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-2 text-muted tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2">
                        <span className="font-medium">{name}</span>
                        {p.federation && <span className="ml-2 text-xs text-muted">{p.federation}</span>}
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {flags.get(p.id)?.map((f) => (
                            <span key={f} className="chip border-warn/50 text-warn">{t(`flags.${f}`)}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.rating ?? <span className="text-muted">{t("unrated")}</span>}</td>
                      <td className="hidden px-4 py-2 tabular-nums text-muted sm:table-cell">{p.fideId ?? "—"}</td>
                      <td className="hidden px-4 py-2 text-muted md:table-cell">{p.club ?? ""}</td>
                      <td className="px-4 py-2 text-right">
                        <RemovePlayerButton name={name} action={removePlayer.bind(null, tour.id, p.id)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <aside>
        <AddPlayerForm action={addPlayer.bind(null, tour.id)} />
      </aside>
    </div>
  );
}
