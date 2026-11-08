import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth-server";

export type CurrentUser = { id: string; email: string; name: string };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  return { id: s.user.id, email: s.user.email, name: s.user.name };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
