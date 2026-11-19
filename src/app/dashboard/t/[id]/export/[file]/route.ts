import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pairingsCsv, playersCsv, standingsCsv, trfReport } from "@/lib/exports";
import { getOwnedTournament, loadEventData } from "@/lib/tournaments";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sign in first", { status: 401 });
  const t = await getOwnedTournament(id, user.id);
  const data = await loadEventData(t.id);
  const base = t.slug.replace(/-[a-z0-9]{5}$/, "");
  const make: Record<string, () => [string, string, string]> = {
    "players.csv": () => [playersCsv(data), "text/csv", `${base}-players.csv`],
    "pairings.csv": () => [pairingsCsv(data), "text/csv", `${base}-pairings.csv`],
    "standings.csv": () => [standingsCsv(t, data), "text/csv", `${base}-standings.csv`],
    "report.trf": () => [trfReport(t, data), "text/plain", `${base}.trf`],
  };
  const f = make[file];
  if (!f) return new NextResponse("Not found", { status: 404 });
  const [body, type, name] = f();
  return new NextResponse(body, {
    headers: { "content-type": `${type}; charset=utf-8`, "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" },
  });
}
