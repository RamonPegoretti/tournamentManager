"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

export function RemovePlayerButton({ name, action }: { name: string; action: () => Promise<void> }) {
  const t = useTranslations("tournament");
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-muted hover:text-bad disabled:opacity-50"
      onClick={() => {
        if (confirm(t("removeConfirm", { name }))) start(() => action());
      }}
    >
      {t("remove")}
    </button>
  );
}
