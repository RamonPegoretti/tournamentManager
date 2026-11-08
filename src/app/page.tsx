import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const t = await getTranslations("home");
  const user = await getCurrentUser();
  return (
    <section className="mx-auto max-w-2xl py-12 text-center sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
      <p className="mt-4 text-base text-muted sm:text-lg">{t("body")}</p>
      <Link href={user ? "/dashboard" : "/login"} className="btn-primary mt-8 px-6 py-3 text-base">
        {user ? t("cta") : t("ctaSignIn")}
      </Link>
    </section>
  );
}
