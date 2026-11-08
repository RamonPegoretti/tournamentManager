import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { LocaleSwitcher } from "./LocaleSwitcher";

export async function TopNav() {
  const t = await getTranslations();
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-accent text-accent-ink">♞</span>
          <span className="hidden sm:inline">{t("app.name")}</span>
        </Link>
        {user && (
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/dashboard" className="rounded-md px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-ink">
              {t("nav.dashboard")}
            </Link>
          </nav>
        )}
        <div className="ml-auto flex items-center gap-3">
          <LocaleSwitcher />
          {user ? (
            <form action={signOut} className="flex items-center gap-3">
              <span className="hidden text-sm text-muted md:inline">{user.email}</span>
              <button className="btn-ghost px-3 py-1.5">{t("nav.signOut")}</button>
            </form>
          ) : (
            <Link href="/login" className="btn-primary px-3 py-1.5">
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
