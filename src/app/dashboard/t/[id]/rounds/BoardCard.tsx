"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { GameKind, GameResult } from "@/lib/chess-types";
import { setResult } from "../../../round-actions";

type Side = { name: string; rating: number | null; points: string; rank: number | null };

export function BoardCard({
  tournamentId,
  gameId,
  board,
  kind,
  result,
  white,
  black,
}: {
  tournamentId: string;
  gameId: string;
  board: number;
  kind: GameKind;
  result: GameResult | null;
  white: Side;
  black: Side | null;
}) {
  const t = useTranslations("rounds");
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(result);

  function choose(r: GameResult | null) {
    start(async () => {
      setShown(r);
      await setResult(tournamentId, gameId, r);
    });
  }

  if (kind !== "game" || !black) {
    return (
      <div className="card flex items-center justify-between gap-3 border-dashed p-4">
        <div>
          <p className="text-xs text-muted">{t("board", { n: board })}</p>
          <p className="font-medium">{white.name}</p>
        </div>
        <span className="chip border-line text-muted">{t(`bye.${kind}`)}</span>
      </div>
    );
  }

  const done = shown !== null;
  const btn = (r: GameResult, label: string) => (
    <button
      type="button"
      disabled={pending}
      aria-pressed={shown === r}
      onClick={() => choose(shown === r ? null : r)}
      className={`rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
        shown === r ? "border-ok bg-ok/15 text-ok" : "border-line bg-surface-2 text-ink hover:border-muted"
      }`}
    >
      {label}
    </button>
  );
  const forfeit = shown === "white_forfeit" || shown === "black_forfeit" || shown === "double_forfeit";

  return (
    <div className={`card p-4 transition-colors ${done ? "border-ok/50" : ""}`}>
      <div className="mb-3 flex items-center justify-between text-xs text-muted">
        <span>{t("board", { n: board })}</span>
        <span className={done ? "text-ok" : "text-accent"}>{done ? "✓" : t("pending")}</span>
      </div>
      <PlayerRow side={white} color="white" />
      <PlayerRow side={black} color="black" />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {btn("white", t("whiteWon"))}
        {btn("draw", t("draw"))}
        {btn("black", t("blackWon"))}
      </div>
      <label className="mt-2 block">
        <span className="sr-only">{t("more")}</span>
        <select
          disabled={pending}
          value={forfeit ? shown! : ""}
          onChange={(e) => choose((e.target.value || null) as GameResult | null)}
          className={`w-full rounded-lg border bg-surface-2 px-2 py-1.5 text-xs ${forfeit ? "border-ok text-ok" : "border-line text-muted"}`}
        >
          <option value="">{done && !forfeit ? t("clear") : t("more")}…</option>
          <option value="white_forfeit">{t("forfeits.white_forfeit")}</option>
          <option value="black_forfeit">{t("forfeits.black_forfeit")}</option>
          <option value="double_forfeit">{t("forfeits.double_forfeit")}</option>
        </select>
      </label>
    </div>
  );
}

function PlayerRow({ side, color }: { side: Side; color: "white" | "black" }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span
        aria-hidden
        className={`h-3 w-3 shrink-0 rounded-full border ${color === "white" ? "border-ink bg-ink" : "border-muted bg-bg"}`}
      />
      <span className="flex-1 truncate font-medium">{side.name}</span>
      <span className="text-xs tabular-nums text-muted">{side.rating ?? ""}</span>
      <span className="w-8 text-right text-sm font-semibold tabular-nums">{side.points}</span>
    </div>
  );
}
