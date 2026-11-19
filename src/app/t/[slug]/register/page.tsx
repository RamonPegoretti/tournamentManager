import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { selfRegister } from "@/app/register-actions";
import { RegistrationForm } from "@/components/RegistrationForm";
import { getTournamentBySlug } from "@/lib/tournaments";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [tour, t] = await Promise.all([getTournamentBySlug(slug), getTranslations("register")]);
  return { title: `${t("title")} · ${tour.name}` };
}

export default async function Register({ params }: Props) {
  const { slug } = await params;
  const tour = await getTournamentBySlug(slug);
  const [t, tf] = await Promise.all([getTranslations("register"), getTranslations("format")]);
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={`/t/${slug}`} className="text-sm text-muted hover:text-ink">← {tour.name}</Link>
      <header>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {[tour.name, tf(tour.format), tour.location, tour.startDate, tour.timeControl].filter(Boolean).join(" · ")}
        </p>
      </header>
      {tour.registrationOpen ? (
        <RegistrationForm action={selfRegister.bind(null, slug)} mode="signup" />
      ) : (
        <div className="card p-8 text-center text-muted">{t("closed")}</div>
      )}
    </div>
  );
}
