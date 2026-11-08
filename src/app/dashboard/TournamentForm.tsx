"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { Tournament } from "@/db/schema";
import { DEFAULT_TIEBREAKS, TIEBREAKS, type Format, type TiebreakCode } from "@/lib/tiebreaks";
import type { FormState } from "./actions";

const FORMATS: Format[] = ["swiss", "round_robin", "knockout", "team"];

type Props = {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  initial?: Tournament;
};

export function TournamentForm({ action, initial }: Props) {
  const t = useTranslations("setup");
  const tf = useTranslations("format");
  const tb = useTranslations("tiebreak");
  const [state, formAction, pending] = useActionState(action, undefined);
  const [format, setFormat] = useState<Format>(initial?.format ?? "swiss");
  const [selected, setSelected] = useState<TiebreakCode[]>(
    (initial?.tiebreaks as TiebreakCode[] | undefined) ?? DEFAULT_TIEBREAKS.swiss,
  );
  const [touchedTiebreaks, setTouched] = useState(Boolean(initial));
  const err = (k: string) => state?.errors?.[k] && <p className="error">{t(`errors.${state.errors[k]}`)}</p>;

  function chooseFormat(f: Format) {
    setFormat(f);
    if (!touchedTiebreaks) setSelected(DEFAULT_TIEBREAKS[f]);
  }
  function toggle(code: TiebreakCode) {
    setTouched(true);
    setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
  }
  function move(code: TiebreakCode, dir: -1 | 1) {
    setTouched(true);
    setSelected((s) => {
      const i = s.indexOf(code);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  const unselected = TIEBREAKS.filter((c) => !selected.includes(c));

  return (
    <form action={formAction} className="space-y-6">
      <section className="card space-y-4 p-5">
        <div>
          <label htmlFor="name" className="field-label">{t("name")}</label>
          <input id="name" name="name" required maxLength={120} defaultValue={initial?.name} placeholder={t("namePlaceholder")} className="input" />
          {err("name")}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="location" className="field-label">{t("location")}</label>
            <input id="location" name="location" defaultValue={initial?.location ?? ""} className="input" />
          </div>
          <div>
            <label htmlFor="startDate" className="field-label">{t("startDate")}</label>
            <input id="startDate" name="startDate" type="date" defaultValue={initial?.startDate ?? ""} className="input" />
          </div>
          <div>
            <label htmlFor="endDate" className="field-label">{t("endDate")}</label>
            <input id="endDate" name="endDate" type="date" defaultValue={initial?.endDate ?? ""} className="input" />
            {err("endDate")}
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <fieldset>
          <legend className="field-label">{t("format")}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FORMATS.map((f) => (
              <label
                key={f}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${format === f ? "border-accent bg-accent/10" : "border-line bg-surface-2 hover:border-muted"}`}
              >
                <input type="radio" name="format" value={f} checked={format === f} onChange={() => chooseFormat(f)} className="sr-only" />
                <span className="block font-semibold">{tf(f)}</span>
                <span className="mt-1 block text-xs text-muted">{tf(`${f}Hint`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          {format !== "round_robin" && (
            <div>
              <label htmlFor="rounds" className="field-label">{t("rounds")}</label>
              <input id="rounds" name="rounds" type="number" min={1} max={30} defaultValue={initial?.rounds ?? (format === "swiss" ? 7 : "")} className="input" />
              <p className="hint">{t("roundsHint")}</p>
              {err("rounds")}
            </div>
          )}
          <div>
            <label htmlFor="timeControl" className="field-label">{t("timeControl")}</label>
            <input id="timeControl" name="timeControl" defaultValue={initial?.timeControl ?? ""} placeholder={t("timeControlPlaceholder")} className="input" />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="field-label mb-0">{t("tiebreaks")}</h2>
          {format !== "knockout" && (
            <button type="button" className="text-sm text-accent hover:underline" onClick={() => { setSelected(DEFAULT_TIEBREAKS[format]); setTouched(false); }}>
              {t("resetDefaults")}
            </button>
          )}
        </div>
        {format === "knockout" ? (
          <p className="hint">{t("noTiebreaks")}</p>
        ) : (
          <>
            <p className="hint mb-3">{t("tiebreaksHint")}</p>
            <ol className="space-y-2">
              {selected.map((c, i) => (
                <li key={c} className="flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2">
                  <input type="hidden" name="tiebreaks" value={c} />
                  <span className="w-5 text-sm font-semibold text-accent">{i + 1}</span>
                  <label className="flex flex-1 items-center gap-2 text-sm">
                    <input type="checkbox" checked onChange={() => toggle(c)} className="accent-[var(--color-accent)]" />
                    {tb(c)}
                  </label>
                  <button type="button" aria-label={t("moveUp")} disabled={i === 0} onClick={() => move(c, -1)} className="rounded px-2 text-muted hover:text-ink disabled:opacity-30">↑</button>
                  <button type="button" aria-label={t("moveDown")} disabled={i === selected.length - 1} onClick={() => move(c, 1)} className="rounded px-2 text-muted hover:text-ink disabled:opacity-30">↓</button>
                </li>
              ))}
              {unselected.map((c) => (
                <li key={c} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                  <span className="w-5" />
                  <label className="flex flex-1 items-center gap-2 text-sm text-muted">
                    <input type="checkbox" checked={false} onChange={() => toggle(c)} />
                    {tb(c)}
                  </label>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary">{initial ? t("save") : t("create")}</button>
        {state?.ok && <span className="text-sm text-ok">{t("saved")}</span>}
      </div>
    </form>
  );
}
