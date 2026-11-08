import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { StatusChip } from "@/components/StatusChip";
import { requireUser } from "@/lib/auth";
import { listTournaments } from "@/lib/tournaments";

export default async function Dashboard() {
  const user = await requireUser();
  const [t, tf, format] = await Promise.all([getTranslations("dashboard"), getTranslations("format"), getFormatter()]);
  const list = await listTournaments(user.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link href="/dashboard/new" className="btn-primary">+ {t("new")}</Link>
      </div>
      {list.length === 0 ? (
        <div className="card p-10 text-center text-muted">{t("empty")}</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((x) => (
            <li key={x.id}>
              <Link href={`/dashboard/t/${x.id}`} className="card block h-full p-5 transition-colors hover:border-accent/60">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold leading-snug">{x.name}</h2>
                  <StatusChip status={x.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {[x.location, x.startDate && format.dateTime(new Date(x.startDate), { dateStyle: "medium" })]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-4 text-sm">
                  {tf(x.format)}
                  {x.rounds ? ` · ${t("rounds", { count: x.rounds })}` : ""} · {t("players", { count: x.playerCount })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
