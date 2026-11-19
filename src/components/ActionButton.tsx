"use client";

import { useTransition } from "react";

/** A button that runs a bound server action, with an optional confirm prompt. */
export function ActionButton({
  action,
  children,
  className = "btn-ghost",
  confirmText,
  pendingText,
}: {
  action: () => Promise<unknown>;
  children: React.ReactNode;
  className?: string;
  confirmText?: string;
  pendingText?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => void (await action()));
      }}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
