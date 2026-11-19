import "server-only";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";

/** Origin of the current request, for links put in emails. */
export async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const newToken = () => randomBytes(18).toString("base64url");
