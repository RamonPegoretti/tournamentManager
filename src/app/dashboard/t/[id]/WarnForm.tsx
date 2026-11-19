"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CopyLink } from "@/components/CopyLink";
import type { WarnState } from "../../registration-actions";

export function WarnForm({ action, hasEmail, defaultNote }: { action: (s: WarnState, f: FormData) => Promise<WarnState>; hasEmail: boolean; defaultNote: string }) {
  const t = useTranslations("warn");
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <details className="group text-left">
      <summary className="cursor-pointer list-none text-xs text-warn hover:underline">{t("warn")}</summary>
      <div className="absolute right-4 z-10 mt-2 w-80 rounded-xl border border-line bg-surface-2 p-4 shadow-xl">
        {state?.link ? (
          <div className="space-y-2 text-sm">
            <p className={state.emailed ? "text-ok" : "text-muted"}>{state.emailed ? t("emailed") : hasEmail ? t("emailFailed") : t("noEmail")}</p>
            <CopyLink link={state.link} />
          </div>
        ) : (
          <form action={formAction} className="space-y-2">
            <label className="field-label" htmlFor="note">{t("note")}</label>
            <textarea id="note" name="note" rows={3} defaultValue={defaultNote} placeholder={t("notePlaceholder")} className="input" />
            <p className="hint">{t("hint")}</p>
            <button disabled={pending} className="btn-primary w-full">{hasEmail ? t("send") : t("makeLink")}</button>
          </form>
        )}
      </div>
    </details>
  );
}
