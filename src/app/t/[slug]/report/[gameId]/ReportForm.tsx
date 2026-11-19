"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { RequestState } from "@/app/request-actions";
import type { GameResult } from "@/lib/chess-types";

const OPTIONS: GameResult[] = ["white", "draw", "black", "white_forfeit", "black_forfeit", "double_forfeit"];

export function ReportForm({ action, current }: { action: (s: RequestState, f: FormData) => Promise<RequestState>; current: GameResult | null }) {
  const t = useTranslations("requests");
  const tr = useTranslations("rounds");
  const [state, formAction, pending] = useActionState(action, undefined);
  if (state?.ok) return <p className="card p-5 text-sm text-ok">{t("sent")}</p>;
  const label = (r: GameResult) =>
    r === "white" ? tr("whiteWon") : r === "black" ? tr("blackWon") : r === "draw" ? tr("draw") : tr(`forfeits.${r}`);
  return (
    <form action={formAction} className="card space-y-4 p-5">
      <fieldset>
        <legend className="field-label">{t("correctResult")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map((r) => (
            <label
              key={r}
              className={`cursor-pointer rounded-lg border border-line bg-surface-2 px-2 py-2 text-center text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10 ${r === current ? "opacity-40" : ""}`}
            >
              <input type="radio" name="result" value={r} disabled={r === current} className="sr-only" />
              {label(r)}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="message" className="field-label">{t("message")}</label>
        <textarea id="message" name="message" rows={3} className="input" placeholder={t("messagePlaceholder")} />
      </div>
      {state?.error && <p className="error">{t(`errors.${state.error}`)}</p>}
      <button disabled={pending} className="btn-primary w-full">{t("send")}</button>
    </form>
  );
}
