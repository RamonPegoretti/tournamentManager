"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/app/actions";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="sr-only">{t("language")}</span>
      <select
        aria-label={t("language")}
        className="rounded-md border border-line bg-surface-2 px-2 py-1 text-sm text-ink"
        value={locale}
        disabled={pending}
        onChange={(e) => start(() => setLocale(e.target.value))}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
