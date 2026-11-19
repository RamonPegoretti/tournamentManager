import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Podium } from "@/components/Podium";
import { Bracket } from "@/components/Bracket";
import { TeamStandingsTable } from "@/components/TeamStandingsTable";
import { roundMatches } from "@/lib/team-view";
import { StandingsTable } from "@/components/StandingsTable";
import { StatusChip } from "@/components/StatusChip";
import { gamePoints, resultLabel } from "@/lib/chess-types";
import { displayName, fmtPoints } from "@/lib/names";
import { computeStandings } from "@/lib/standings";
import type { TiebreakCode } from "@/lib/tiebreaks";
import { getTournamentBySlug, loadEventData } from "@/lib/tournaments";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string; round?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTournamentBySlug(slug);
  return { title: t.name };
}

export default async function PublicTournament({ params, searchParams }: Props) {
  const { slug } = await params;
  const { view, round } = await searchParams;
  const tour = await getTournamentBySlug(slug);
  const data = await loadEventData(tour.id);
  const [t, ts, tf, tr] = await Promise.all([getTranslations("public"), getTranslations("standings"), getTranslations("format"), getTranslations("rounds")]);
  const tab = view === "standings" ? "standings" : "pairings";
  const selected = Math.min(Math.max(Number(round) || data.currentRound, 0), data.currentRound);
  const byId = new Map(data.players.map((p) => [p.id, p]));

  const pointsBefore = new Map<string, number>();
  for (const g of data.games.filter((x) => x.round < selected)) {
    const [w, b] = gamePoints(g.kind, g.result);
    pointsBefore.set(g.whiteId, (pointsBefore.get(g.whiteId) ?? 0) + w);
    if (g.blackId) pointsBefore.set(g.blackId, (pointsBefore.get(g.blackId) ?? 0) + b);
  }

  const gameItem = (g: (typeof data.games)[number]) => {
                  const w = byId.get(g.whiteId)!;
                  const b = g.blackId ? byId.get(g.blackId)! : null;
                  const res = resultLabel(g.kind, g.result);
                  return (
                    <li key={g.id} className={`card grid grid-cols-[2rem_1fr_auto] items-center gap-3 p-3 ${g.result || g.kind !== "game" ? "" : "border-accent/40"}`}>
                      <span className="text-center text-sm text-muted tabular-nums">{g.board}</span>
                      <div className="min-w-0 text-sm">
                        <p className="flex items-center gap-2 truncate">
                          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-ink" />
                          <span className="truncate font-medium">{displayName(w)}</span>
                          <span className="text-xs text-muted tabular-nums">{fmtPoints(pointsBefore.get(w.id) ?? 0)}</span>
                        </p>
                        {b ? (
                          <p className="mt-1 flex items-center gap-2 truncate">
                            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full border border-muted" />
                            <span className="truncate font-medium">{displayName(b)}</span>
                            <span className="text-xs text-muted tabular-nums">{fmtPoints(pointsBefore.get(b.id) ?? 0)}</span>
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted">{tr(`bye.${g.kind}`)}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-sm font-semibold tabular-nums ${res ? "text-ok" : "text-accent"}`}>{res || tr("pending")}</span>
                        {g.kind === "game" && (
                          <Link href={`/t/${slug}/report/${g.id}`} className="text-xs text-muted hover:text-warn">{t("report")}</Link>
                        )}
                      </div>
                    </li>
                  );
                };

  const tabLink = (v: "pairings" | "standings", label: string) => (
    <Link
      href={`?view=${v}`}
      aria-current={tab === v ? "page" : undefined}
      className={`flex-1 rounded-md py-2 text-center text-sm font-semibold ${tab === v ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {tour.status !== "finished" && <AutoRefresh seconds={15} />}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{tour.name}</h1>
          <StatusChip status={tour.status} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {[tf(tour.format), tour.location, tour.timeControl, t("players") + ": " + data.players.length].filter(Boolean).join(" · ")}
        </p>
        {tour.registrationOpen && (
          <Link href={`/t/${slug}/register`} className="btn-primary mt-3 w-full sm:w-auto">{t("register")}</Link>
        )}
        {tour.status === "running" && (
          <p className="mt-1 flex items-center gap-2 text-xs text-ok">
            <span className="h-2 w-2 animate-pulse rounded-full bg-ok" /> {ts("live")} · {ts("updated")}
          </p>
        )}
      </header>

      {data.currentRound > 0 && (
        <p className="-mb-3 text-right">
          <Link href={`/t/${slug}/print?view=${tab}&round=${selected}`} className="text-xs text-muted hover:text-ink">{t("print")} ↗</Link>
        </p>
      )}
      <nav className="flex gap-1 rounded-lg border border-line bg-surface p-1">
        {tabLink("pairings", t("pairings"))}
        {tabLink("standings", t("standings"))}
      </nav>

      {tab === "pairings" &&
        (data.currentRound === 0 ? (
          <section className="space-y-3">
            <div className="card p-4 text-center text-sm text-muted">{t("notStarted")}</div>
            {data.players.length > 0 && (
              <div className="card divide-y divide-line/60">
                <p className="px-4 py-2 text-xs uppercase tracking-wide text-muted">{t("entries", { count: data.players.length })}</p>
                {[...data.players]
                  .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.lastName.localeCompare(b.lastName))
                  .map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <span className="w-6 text-right tabular-nums text-muted">{i + 1}</span>
                      <span className="flex-1 font-medium">
                        {displayName(p)}
                        {p.federation && <span className="ml-2 text-xs text-muted">{p.federation}</span>}
                        {!p.approved && <span className="chip ml-2 border-warn/50 text-warn">{t("pendingEntry")}</span>}
                      </span>
                      <span className="tabular-nums text-muted">{p.rating ?? t("unrated")}</span>
                    </div>
                  ))}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {data.rounds.map((r) => (
                <Link
                  key={r.number}
                  href={`?view=pairings&round=${r.number}`}
                  className={`rounded-full border px-3 py-1 text-sm ${r.number === selected ? "border-accent bg-accent/15" : "border-line text-muted"}`}
                >
                  {r.number}
                </Link>
              ))}
            </div>
            <h2 className="font-semibold">{t("round", { n: selected })}</h2>
            {tour.format === "team" ? (
              roundMatches(data, selected, tour.boardsPerTeam).map((m) => (
                <div key={m.match.id} className="space-y-2">
                  <p className="flex flex-wrap items-baseline gap-2 pt-2 text-sm">
                    <span className="font-semibold">{m.home}</span>
                    <span className={`font-bold tabular-nums ${m.done ? "text-ok" : "text-accent"}`}>
                      {m.away ? `${fmtPoints(m.score[0])} – ${fmtPoints(m.score[1])}` : tr("teamBye")}
                    </span>
                    {m.away && <span className="font-semibold">{m.away}</span>}
                  </p>
                  <ul className="space-y-2">{m.games.map((g, i) => gameItem({ ...g, board: i + 1 }))}</ul>
                </div>
              ))
            ) : (
              <ul className="space-y-2">{data.games.filter((g) => g.round === selected).map((g) => gameItem(g))}</ul>
            )}
          </section>
        ))}

      {tab === "standings" &&
        (tour.format === "knockout" && data.currentRound > 0 ? (
          <Bracket data={data} totalRounds={tour.rounds ?? data.currentRound} />
        ) : data.roundsDone === 0 ? (
          <div className="card p-8 text-center text-muted">{ts("none")}</div>
        ) : (
          <StandingsSection tour={tour} data={data} afterLabel={ts("after", { n: data.roundsDone })} />
        ))}
    </div>
  );
}

function StandingsSection({
  tour,
  data,
  afterLabel,
}: {
  tour: Awaited<ReturnType<typeof getTournamentBySlug>>;
  data: Awaited<ReturnType<typeof loadEventData>>;
  afterLabel: string;
}) {
  if (tour.format === "team")
    return (
      <section className="space-y-4">
        <p className="text-sm text-muted">{afterLabel}</p>
        <TeamStandingsTable data={data} boards={tour.boardsPerTeam} />
      </section>
    );
  const rows = computeStandings(data.playerLites, data.gameLites, tour.tiebreaks as TiebreakCode[], data.roundsDone);
  return (
    <section className="space-y-4">
      <p className="text-sm text-muted">{afterLabel}</p>
      <Podium rows={rows} />
      <div className="sm:hidden">
        <StandingsTable rows={rows} tiebreaks={tour.tiebreaks} compact />
      </div>
      <div className="hidden sm:block">
        <StandingsTable rows={rows} tiebreaks={tour.tiebreaks} />
      </div>
    </section>
  );
}
