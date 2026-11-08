import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { isLocale, localeFromHeader, LOCALE_COOKIE } from "./config";

export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(fromCookie) ? fromCookie : localeFromHeader((await headers()).get("accept-language"));
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
