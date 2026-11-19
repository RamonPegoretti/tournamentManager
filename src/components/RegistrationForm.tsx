"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { RegisterState } from "@/app/register-actions";
import { CopyLink } from "./CopyLink";

type Defaults = {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  fideId?: string | null;
  federation?: string | null;
  birthYear?: number | null;
  club?: string | null;
};

type Lookup = { status: string; name?: string; rating?: number | null; federation?: string | null } | null;

export function RegistrationForm({
  action,
  defaults = {},
  mode,
}: {
  action: (s: RegisterState, f: FormData) => Promise<RegisterState>;
  defaults?: Defaults;
  mode: "signup" | "fix";
}) {
  const t = useTranslations("register");
  const tp = useTranslations("player");
  const [state, formAction, pending] = useActionState(action, undefined);
  const [ratingType, setRatingType] = useState<"fide" | "unrated" | "">(mode === "fix" ? (defaults.fideId ? "fide" : "unrated") : "");
  const [fideId, setFideId] = useState(defaults.fideId ?? "");
  const [lookup, setLookup] = useState<Lookup>(null);
  const [checking, setChecking] = useState(false);

  if (state?.ok && mode === "signup") {
    return (
      <div className="card space-y-3 p-6">
        <h2 className="text-lg font-semibold text-ok">{t("done")}</h2>
        <p className="text-sm text-muted">{t("doneHint")}</p>
        {state.fideCheck && state.fideCheck !== "ok" && <p className="text-sm text-warn">{t(`fideStatus.${state.fideCheck}`)}</p>}
        {state.link && (
          <>
            <p className="text-sm">{t("keepLink")}</p>
            <CopyLink link={state.link} />
          </>
        )}
      </div>
    );
  }

  const err = (k: string) => {
    const code = state?.errors?.[k];
    if (!code) return null;
    const ns = k === "form" || k === "ratingType" ? t : tp;
    return <p className="error">{ns(`errors.${code}`)}</p>;
  };

  async function check() {
    if (!/^\d{1,10}$/.test(fideId)) return;
    setChecking(true);
    try {
      const r = await fetch(`/api/fide/${fideId}`);
      setLookup(await r.json());
    } catch {
      setLookup({ status: "unverified" });
    } finally {
      setChecking(false);
    }
  }

  const input = (name: keyof Defaults, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={name} className="field-label">{tp(name)}</label>
      <input id={name} name={name} defaultValue={defaults[name] == null ? "" : String(defaults[name])} className="input" {...props} />
      {err(name)}
    </div>
  );

  return (
    <form action={formAction} className="card space-y-4 p-5">
      {state?.ok && <p className="rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-sm text-ok">{t("saved")}</p>}
      {err("form")}
      <div className="grid grid-cols-2 gap-3">
        {input("firstName", { required: true, autoComplete: "given-name" })}
        {input("lastName", { required: true, autoComplete: "family-name" })}
      </div>
      {input("email", { type: "email", required: true, autoComplete: "email" })}

      <fieldset>
        <legend className="field-label">{t("rating")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["fide", "unrated"] as const).map((v) => (
            <label
              key={v}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${ratingType === v ? "border-accent bg-accent/10" : "border-line bg-surface-2"}`}
            >
              <input type="radio" name="ratingType" value={v} checked={ratingType === v} onChange={() => setRatingType(v)} className="sr-only" />
              <span className="font-medium">{t(`ratingType.${v}`)}</span>
              <span className="block text-xs text-muted">{t(`ratingTypeHint.${v}`)}</span>
            </label>
          ))}
        </div>
        {err("ratingType")}
      </fieldset>

      {ratingType === "fide" && (
        <div>
          <label htmlFor="fideId" className="field-label">{tp("fideId")}</label>
          <div className="flex gap-2">
            <input
              id="fideId"
              name="fideId"
              inputMode="numeric"
              pattern="\d*"
              required
              value={fideId}
              onChange={(e) => {
                setFideId(e.target.value.trim());
                setLookup(null);
              }}
              onBlur={check}
              className="input"
            />
            <button type="button" onClick={check} disabled={checking} className="btn-ghost shrink-0">
              {checking ? t("checking") : t("check")}
            </button>
          </div>
          {err("fideId")}
          {lookup?.status === "ok" && (
            <p className="mt-2 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-sm">
              <span className="font-medium">{lookup.name}</span> · {lookup.federation} ·{" "}
              {lookup.rating ? t("fideRating", { rating: lookup.rating }) : t("fideUnrated")}
            </p>
          )}
          {lookup && lookup.status !== "ok" && <p className="mt-2 text-sm text-warn">{t(`fideStatus.${lookup.status}`)}</p>}
          {lookup?.status === "unverified" && (
            <div className="mt-3">
              <label htmlFor="declaredRating" className="field-label">{t("declaredRating")}</label>
              <input id="declaredRating" name="declaredRating" type="number" min={1000} max={3000} className="input" />
              <p className="hint">{t("declaredRatingHint")}</p>
              {err("declaredRating")}
            </div>
          )}
        </div>
      )}
      {ratingType === "unrated" && <input type="hidden" name="fideId" value="" />}

      <div className="grid grid-cols-2 gap-3">
        {input("federation", { maxLength: 3, placeholder: "ITA", className: "input uppercase" })}
        {input("birthYear", { type: "number", min: 1900, max: new Date().getFullYear() })}
      </div>
      {input("club")}
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <button disabled={pending} className="btn-primary w-full">{mode === "signup" ? t("submit") : t("save")}</button>
    </form>
  );
}
