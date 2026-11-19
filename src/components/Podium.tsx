import { fmtPoints, displayName } from "@/lib/names";
import type { StandingRow } from "@/lib/standings";

const STYLE = ["h-28 border-warn/60 bg-warn/10", "h-20 border-line bg-surface-2", "h-16 border-line bg-surface-2"];
const ORDER = [1, 0, 2]; // 2nd, 1st, 3rd

export function Podium({ rows }: { rows: StandingRow[] }) {
  const top = rows.slice(0, 3);
  if (top.length < 3) return null;
  return (
    <div className="grid grid-cols-3 items-end gap-2">
      {ORDER.map((i) => {
        const r = top[i];
        return (
          <div key={r.player.id} className="text-center">
            <p className="truncate text-sm font-semibold">{displayName(r.player).split(",")[0]}</p>
            <p className="mb-1 text-xs text-muted tabular-nums">{fmtPoints(r.points)}</p>
            <div className={`grid place-items-center rounded-t-lg border text-2xl font-bold ${STYLE[i]}`}>{r.rank}</div>
          </div>
        );
      })}
    </div>
  );
}
