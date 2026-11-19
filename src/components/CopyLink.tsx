"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function CopyLink({ link }: { link: string }) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={link} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn-ghost shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          } catch {
            /* clipboard blocked: the field is selectable */
          }
        }}
      >
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
