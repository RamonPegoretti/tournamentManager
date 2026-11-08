import { getTranslations } from "next-intl/server";
import type { Tournament } from "@/db/schema";

const STYLE: Record<Tournament["status"], string> = {
  draft: "border-line text-muted",
  registration: "border-warn/50 text-warn",
  running: "border-accent/50 text-accent",
  finished: "border-ok/50 text-ok",
};

export async function StatusChip({ status }: { status: Tournament["status"] }) {
  const t = await getTranslations("status");
  return <span className={`chip ${STYLE[status]}`}>{t(status)}</span>;
}
