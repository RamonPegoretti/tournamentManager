"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { parsePlayersFile } from "@/lib/players-import";
import type { FormState } from "../../../actions";

export function ImportForm({ action, backHref }: { action: (s: FormState, f: FormData) => Promise<FormState>; backHref: string }) {
  const t = useTranslations("import");
  const tp = useTranslations("player");
  const tt = useTranslations("tournament");
  const [text, setText] = useState("");
  const [state, formAction, pending] = useActionState(action, undefined);
  const result = useMemo(() => (text.trim() ? parsePlayersFile(text) : null), [text]);
  const ok = result?.rows.filter((r) => r.player) ?? [];
  const bad = result?.rows.filter((r) => !r.player) ?? [];

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setText(await file.text());
  }

  return (
    <form action={formAction} className="space-y-6">
      <section className="card space-y-4 p-5">
        <p className="text-sm">{t("body")}</p>
        <p className="hint">{t("columns")}</p>
        <div>
          <label htmlFor="file" className="field-label">{t("file")}</label>
          <input id="file" type="file" accept=".csv,.tsv,.txt,text/csv" onChange={onFile} className="text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-ink" />
        </div>
        <div>
          <label htmlFor="text" className="field-label">{t("paste")}</label>
          <textarea id="text" name="text" rows={8} value={text} onChange={(e) => setText(e.target.value)} className="input font-mono text-xs" />
        </div>
      </section>

      {(result?.missingColumns.length || state?.errors?.form) && (
        <p className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm text-bad">{t("missingName")}</p>
      )}

      {result && !result.missingColumns.length && (
        <section className="card p-5">
          <h2 className="font-semibold">{t("preview")}</h2>
          <p className="mt-1 text-sm text-ok">{t("ready", { ok: ok.length })}</p>
          {bad.length > 0 && (
            <div className="mt-2 text-sm text-warn">
              <p>{t("problems", { count: bad.length })}</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {bad.slice(0, 20).map((r) => (
                  <li key={r.line}>
                    {t("line", { line: r.line })}: {r.errors.map((e) => t(`errors.${e}`)).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ok.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="py-1 pr-4 font-medium">{tp("lastName")}</th>
                    <th className="py-1 pr-4 font-medium">{tp("firstName")}</th>
                    <th className="py-1 pr-4 text-right font-medium">{tp("rating")}</th>
                    <th className="py-1 pr-4 font-medium">{tp("fideId")}</th>
                    <th className="py-1 font-medium">{tp("federation")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ok.slice(0, 50).map((r) => (
                    <tr key={r.line} className="border-t border-line/60">
                      <td className="py-1 pr-4">{r.player!.lastName}</td>
                      <td className="py-1 pr-4">{r.player!.firstName}</td>
                      <td className="py-1 pr-4 text-right tabular-nums">{r.player!.rating ?? <span className="text-muted">{tt("unrated")}</span>}</td>
                      <td className="py-1 pr-4 tabular-nums text-muted">{r.player!.fideId ?? "—"}</td>
                      <td className="py-1 text-muted">{r.player!.federation ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="flex gap-3">
        <button disabled={pending || ok.length === 0} className="btn-primary">{t("confirm", { count: ok.length })}</button>
        <Link href={backHref} className="btn-ghost">{t("back")}</Link>
      </div>
    </form>
  );
}
