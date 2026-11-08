"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { auth } from "@/lib/auth-server";

export type LoginState = { error?: "invalid" | "credentials" | "exists" | "unknown"; values?: { email: string; name: string } } | undefined;

const signInInput = z.object({ email: z.email(), password: z.string().min(8) });
const signUpInput = signInInput.extend({ name: z.string().trim().min(1).max(80) });

export async function signIn(_: LoginState, form: FormData): Promise<LoginState> {
  const intent = form.get("intent") === "signup" ? "signup" : "signin";
  const raw = {
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
    name: String(form.get("name") ?? ""),
  };
  const values = { email: raw.email, name: raw.name };
  try {
    if (intent === "signup") {
      const parsed = signUpInput.safeParse(raw);
      if (!parsed.success) return { error: "invalid", values };
      await auth.api.signUpEmail({ body: parsed.data, headers: await headers() });
    } else {
      const parsed = signInInput.safeParse(raw);
      if (!parsed.success) return { error: "credentials", values };
      await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
    }
  } catch (e) {
    if (e instanceof APIError) {
      if (intent === "signup" && e.status === "UNPROCESSABLE_ENTITY") return { error: "exists", values };
      if (e.status === "UNAUTHORIZED") return { error: "credentials", values };
    }
    console.error(e);
    return { error: "unknown", values };
  }
  redirect("/dashboard");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
