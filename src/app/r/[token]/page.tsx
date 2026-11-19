import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { loadRegistration, updateRegistration } from "@/app/register-actions";
import { RegistrationForm } from "@/components/RegistrationForm";
import { displayName } from "@/lib/names";

export const metadata: Metadata = { robots: { index: false } };

export default async function FixRegistration({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reg = await loadRegistration(token);
  if (!reg) notFound();
  const { player: p, tournament: tour } = reg;
  const t = await getTranslations("register");
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={`/t/${tour.slug}`} className="text-sm text-muted hover:text-ink">← {tour.name}</Link>
      <header>
        <h1 className="text-2xl font-bold">{t("yourRegistration")}</h1>
        <p className="mt-1 text-sm text-muted">
          {displayName(p)} · {tour.name} · {p.approved ? <span className="text-ok">{t("approved")}</span> : <span className="text-warn">{t("waiting")}</span>}
        </p>
      </header>
      {p.warningNote && (
        <div className="rounded-xl border border-warn/50 bg-warn/10 p-4 text-sm">
          <p className="font-semibold text-warn">{t("organizerNote")}</p>
          <p className="mt-1 whitespace-pre-line">{p.warningNote}</p>
        </div>
      )}
      {reg.editable ? (
        <RegistrationForm action={updateRegistration.bind(null, token)} defaults={p} mode="fix" />
      ) : (
        <div className="card p-6 text-sm text-muted">{t("locked")}</div>
      )}
    </div>
  );
}
