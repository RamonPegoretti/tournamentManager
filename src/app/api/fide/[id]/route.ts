import { NextResponse } from "next/server";
import { lookupFide } from "@/lib/fide-lookup";

/** Lets the signup form show the player's FIDE name and rating before they submit. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await lookupFide(id);
  if (r.status !== "ok") return NextResponse.json(r);
  const { name, rating, federation } = r.profile;
  return NextResponse.json({ status: "ok", name, rating, federation }, { headers: { "cache-control": "public, max-age=3600" } });
}
