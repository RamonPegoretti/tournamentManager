"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Tabs({ tabs, base }: { tabs: { href: string; label: string; match: string[] }[]; base: string }) {
  const rest = usePathname().slice(base.length);
  return (
    <nav className="flex gap-1 border-b border-line">
      {tabs.map((tab) => {
        const active = tab.match.includes(rest);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
