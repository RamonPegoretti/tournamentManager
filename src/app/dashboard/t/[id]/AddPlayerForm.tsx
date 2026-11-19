"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Player } from "@/db/schema";
import type { FormState } from "../../actions";

export function AddPlayerForm({
  action,
  player,
  teams,
  teamName,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  player?: Player;
  teams?: string[];
  teamName?: string;
}) {
  const t = useTranslations("player");
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      ref.current?.querySelector<HTMLInputElement>("#firstName")?.focus();
    }
  }, [state]);
  const err = (k: string) => state?.errors?.[k] && <p className="error">{t(`errors.${state.errors[k]}`)}</p>;
  const field = (name: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div>
      <label htmlFor={name} className="field-label">{t(name)}</label>
      <input
        id={name}
        name={name}
        className="input"
        defaultValue={player ? String(player[name as keyof Player] ?? "") : undefined}
        {...props}
      />
      {hint && <p className="hint">{hint}</p>}
      {err(name)}
    </div>
  );
  return (
    <form ref={ref} action={formAction} className="card space-y-3 p-5">
      <h2 className="font-semibold">{player ? t("edit") : t("add")}</h2>
      {err("form")}
      <div className="grid grid-cols-2 gap-3">
        {field("firstName", { autoComplete: "off" })}
        {field("lastName", { required: true, autoComplete: "off" })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("fideId", { inputMode: "numeric", pattern: "\\d*" })}
        {field("rating", { type: "number", min: 1000, max: 3000 }, t("ratingHint"))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("federation", { maxLength: 3, placeholder: "ITA", className: "input uppercase" })}
        {field("birthYear", { type: "number", min: 1900, max: new Date().getFullYear() })}
      </div>
      {teams && (
        <div>
          <label htmlFor="team" className="field-label">{t("team")}</label>
          <input id="team" name="team" list="team-names" required defaultValue={teamName ?? ""} className="input" autoComplete="off" />
          <datalist id="team-names">
            {teams.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <p className="hint">{t("teamHint")}</p>
        </div>
      )}
      {field("club")}
      {field("email", { type: "email" })}
      <button disabled={pending} className="btn-primary w-full">{player ? t("save") : t("add")}</button>
    </form>
  );
}
