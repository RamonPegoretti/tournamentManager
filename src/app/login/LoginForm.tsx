"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const t = useTranslations("login");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, undefined);
  const signup = mode === "signup";
  return (
    <form action={action} className="card space-y-4 p-6">
      <div className="grid grid-cols-2 rounded-lg border border-line bg-surface-2 p-1 text-sm">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`rounded-md py-1.5 font-medium ${mode === m ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"}`}
          >
            {m === "signin" ? t("submit") : t("signUp")}
          </button>
        ))}
      </div>
      {signup && (
        <div>
          <label htmlFor="name" className="field-label">{t("name")}</label>
          <input id="name" name="name" required autoComplete="name" defaultValue={state?.values?.name} className="input" />
        </div>
      )}
      <div>
        <label htmlFor="email" className="field-label">{t("email")}</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} className="input" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">{t("password")}</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={signup ? "new-password" : "current-password"}
          className="input"
        />
        {signup && <p className="hint">{t("passwordHint")}</p>}
      </div>
      {state?.error && <p className="error" role="alert">{t(`errors.${state.error}`)}</p>}
      <button name="intent" value={mode} disabled={pending} className="btn-primary w-full">
        {signup ? t("signUp") : t("submit")}
      </button>
    </form>
  );
}
