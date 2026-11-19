import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && /^\/(?!\/)/.test(next) ? next : undefined;
  if (await getCurrentUser()) redirect(safeNext ?? "/dashboard");
  const t = await getTranslations("login");
  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      {safeNext && <p className="mb-4 text-sm text-muted">{t("toContinue")}</p>}
      <LoginForm next={safeNext} />
    </div>
  );
}
