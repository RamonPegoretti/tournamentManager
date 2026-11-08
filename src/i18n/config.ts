export const LOCALES = ["en", "it", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "tm_locale";
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", it: "Italiano", es: "Español" };

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

/** Pick the best supported locale from an Accept-Language header. */
export function localeFromHeader(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}
