"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "../../actions";

export function AddPlayerForm({ action }: { action: (s: FormState, f: FormData) => Promise<FormState> }) {
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
      <input id={name} name={name} className="input" {...props} />
      {hint && <p className="hint">{hint}</p>}
      {err(name)}
    </div>
  );
  return (
    <form ref={ref} action={formAction} className="card space-y-3 p-5">
      <h2 className="font-semibold">{t("add")}</h2>
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
      {field("club")}
      {field("email", { type: "email" })}
      <button disabled={pending} className="btn-primary w-full">{t("add")}</button>
    </form>
  );
}
