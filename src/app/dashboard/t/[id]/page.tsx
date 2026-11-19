import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { playerFlags } from "@/lib/flags";
import { getOwnedTournament, listPlayers } from "@/lib/tournaments";
import { db } from "@/db";
import { games } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setWithdrawn } from "../../round-actions";
import { addPlayer, removePlayer } from "../../actions";
import { applyFideRatings, approvePlayers, recheckFide, setRegistrationOpen, warnPlayer } from "../../registration-actions";
import { ActionButton } from "@/components/ActionButton";
import { CopyLink } from "@/components/CopyLink";
import { baseUrl } from "@/lib/url";
import { WarnForm } from "./WarnForm";
import { AddPlayerForm } from "./AddPlayerForm";
import { RemovePlayerButton } from "./RemovePlayerButton";
import { WithdrawButton } from "./WithdrawButton";

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
  const paired = await db.select({ w: games.whiteId, b: games.blackId }).from(games).where(eq(games.tournamentId, tour.id));
  const hasGames = new Set(paired.flatMap((g) => [g.w, g.b]).filter(Boolean) as string[]);
  const [t, tp, ti, tg] = await Promise.all([
    getTranslations("tournament"),
    getTranslations("player"),
    getTranslations("import"),
    getTranslations("registration"),
  ]);
  const started = hasGames.size > 0;
  const pending = players.filter((p) => !p.approved && p.status === "active");
  const flagged = players.filter((p) => (flags.get(p.id)?.length ?? 0) > 0).length;
  const withFide = players.filter((p) => p.fideId).length;
  const ratingDiffs = players.filter((p) => flags.get(p.id)?.includes("fideRatingDiff")).length;
  const signupLink = `${await baseUrl()}/t/${tour.slug}/register`;
  const rated = players.filter((p) => p.rating !== null);
  const avg = rated.length ? Math.round(rated.reduce((s, p) => s + p.rating!, 0) / rated.length) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section>
        {imported && (
          <p className="mb-4 rounded-lg border border-ok/40 bg-ok/10 px-4 py-2 text-sm text-ok">{ti("done", { count: Number(imported) || 0 })}</p>
        )}
        {!started && (
          <div className="card mb-4 space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="mr-auto">
                <p className="font-semibold">
                  {tg("selfSignup")}:{" "}
                  <span className={tour.registrationOpen ? "text-ok" : "text-muted"}>{tour.registrationOpen ? tg("open") : tg("closed")}</span>
                </p>
                <p className="text-xs text-muted">{tour.registrationOpen ? tg("openHint") : tg("closedHint")}</p>
              </div>
              <ActionButton action={setRegistrationOpen.bind(null, tour.id, !tour.registrationOpen)} className={tour.registrationOpen ? "btn-ghost" : "btn-primary"}>
                {tour.registrationOpen ? tg("close") : tg("openAction")}
              </ActionButton>
            </div>
            {tour.registrationOpen && <CopyLink link={signupLink} />}
            {withFide > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
                <span className="mr-auto text-muted">{tg("fideHint", { count: withFide })}</span>
                <ActionButton action={recheckFide.bind(null, tour.id)} pendingText={tg("checking")}>{tg("recheck")}</ActionButton>
                {ratingDiffs > 0 && (
                  <ActionButton action={applyFideRatings.bind(null, tour.id)} confirmText={tg("applyConfirm", { count: ratingDiffs })}>
                    {tg("apply", { count: ratingDiffs })}
                  </ActionButton>
                )}
              </div>
            )}
          </div>
        )}
        {pending.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warn/50 bg-warn/10 px-4 py-3">
            <div className="mr-auto text-sm">
              <p className="font-semibold text-warn">{tg("pending", { count: pending.length })}</p>
              <p className="text-muted">{flagged > 0 ? tg("pendingFlagged", { count: flagged }) : tg("pendingHint")}</p>
            </div>
            <ActionButton action={approvePlayers.bind(null, tour.id)} className="btn-primary">{tg("approve")}</ActionButton>
          </div>
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
                    <tr key={p.id} className={`border-b border-line/60 last:border-0 ${p.status === "withdrawn" ? "opacity-60" : ""}`}>
                      <td className="px-4 py-2 text-muted tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2">
                        <span className="font-medium">{name}</span>
                        {p.federation && <span className="ml-2 text-xs text-muted">{p.federation}</span>}
                        {p.status === "withdrawn" && <span className="chip ml-2 border-bad/50 text-bad">{t("withdrawn")}</span>}
                        {!p.approved && <span className="chip ml-2 border-warn/50 bg-warn/10 text-warn">{tg("new")}</span>}
                        {p.warningNote !== null && p.warnedAt && <span className="chip ml-2 border-warn/50 text-warn">{tg("warned")}</span>}
                        {p.fixedAt && !p.warningNote && <span className="chip ml-2 border-ok/50 text-ok">{tg("updated")}</span>}
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {flags.get(p.id)?.map((f) => (
                            <span
                              key={f}
                              className="chip border-warn/50 text-warn"
                              title={f === "fideNameMismatch" || f === "fideRatingDiff" ? `FIDE: ${p.fideName} · ${p.fideRating ?? t("unrated")}` : undefined}
                            >
                              {t(`flags.${f}`)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.rating ?? <span className="text-muted">{t("unrated")}</span>}</td>
                      <td className="hidden px-4 py-2 tabular-nums text-muted sm:table-cell">{p.fideId ?? "—"}</td>
                      <td className="hidden px-4 py-2 text-muted md:table-cell">{p.club ?? ""}</td>
                      <td className="relative whitespace-nowrap px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-3">
                        <Link href={`/dashboard/t/${tour.id}/players/${p.id}`} className="text-xs text-accent hover:underline">{t("edit")}</Link>
                        {!hasGames.has(p.id) && (
                          <WarnForm action={warnPlayer.bind(null, tour.id, p.id)} hasEmail={Boolean(p.email)} defaultNote={p.warningNote ?? ""} />
                        )}
                        {hasGames.has(p.id) ? (
                          <WithdrawButton withdrawn={p.status === "withdrawn"} action={setWithdrawn.bind(null, tour.id, p.id, p.status !== "withdrawn")} />
                        ) : (
                          <RemovePlayerButton name={name} action={removePlayer.bind(null, tour.id, p.id)} />
                        )}
                        </div>
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
