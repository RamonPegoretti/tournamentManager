"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

export function WithdrawButton({ withdrawn, action }: { withdrawn: boolean; action: () => Promise<unknown> }) {
  const t = useTranslations("tournament");
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => void (await action()))}
      className={`text-xs disabled:opacity-50 ${withdrawn ? "text-accent hover:underline" : "text-muted hover:text-bad"}`}
    >
      {withdrawn ? t("reinstate") : t("withdraw")}
    </button>
  );
}
