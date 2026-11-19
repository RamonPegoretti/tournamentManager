"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { pairNextRound, unpairLastRound, type ActionResult } from "../../../round-actions";

export function RoundControls({
  tournamentId,
  nextRound,
  canPair,
  canUnpair,
  lastRound,
}: {
  tournamentId: string;
  nextRound: number;
  canPair: boolean;
  canUnpair: boolean;
  lastRound: number;
}) {
  const t = useTranslations("rounds");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<ActionResult | null>(null);

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    setError(null);
    start(async () => {
      try {
        const r = await fn();
        if (r.error) setError(r);
        else after?.();
      } catch {
        setError({ error: "unknown" });
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {canPair && (
          <button
            disabled={pending}
            className="btn-primary"
            onClick={() => run(() => pairNextRound(tournamentId), () => router.push(`?round=${nextRound}`))}
          >
            {pending ? t("pairing") : t("pairRound", { n: nextRound })}
          </button>
        )}
        {canUnpair && (
          <button
            disabled={pending}
            className="btn-ghost"
            onClick={() => {
              if (confirm(t("unpairConfirm", { n: lastRound }))) run(() => unpairLastRound(tournamentId), () => router.push(`?round=${lastRound - 1 || ""}`));
            }}
          >
            {t("unpair", { n: lastRound })}
          </button>
        )}
      </div>
      {error?.error && (
        <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm text-bad">
          {t(`errors.${error.error}`, { detail: error.detail ?? "" })}
        </p>
      )}
    </div>
  );
}
