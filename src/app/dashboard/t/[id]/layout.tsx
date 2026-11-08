import { getTranslations } from "next-intl/server";
import { StatusChip } from "@/components/StatusChip";
import { requireUser } from "@/lib/auth";
import { getOwnedTournament } from "@/lib/tournaments";
import { Tabs } from "./Tabs";

export default async function TournamentLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const tour = await getOwnedTournament(id, user.id);
  const [t, tf] = await Promise.all([getTranslations("tournament"), getTranslations("format")]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{tour.name}</h1>
        <StatusChip status={tour.status} />
        <span className="text-sm text-muted">
          {[tf(tour.format), tour.location, tour.timeControl].filter(Boolean).join(" · ")}
        </span>
      </div>
      <Tabs
        tabs={[
          { href: `/dashboard/t/${id}`, label: t("players"), match: ["", "/import"] },
          { href: `/dashboard/t/${id}/settings`, label: t("settings"), match: ["/settings"] },
        ]}
        base={`/dashboard/t/${id}`}
      />
      <div className="mt-6">{children}</div>
    </div>
  );
}
