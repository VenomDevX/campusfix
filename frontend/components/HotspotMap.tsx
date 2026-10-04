import type { Hotspot } from "@/types";

// Stylised campus plan on a 6-column grid. A data visualisation, so tiles are allowed here.
const LAYOUT: Record<string, string> = {
  "Block A": "col-span-6 sm:col-span-2 sm:row-span-2",
  "Library": "col-span-3 sm:col-span-2",
  "Block B": "col-span-3 sm:col-span-2 sm:row-span-2",
  "Cafeteria": "col-span-3 sm:col-span-2",
  "Lab Block": "col-span-3 sm:col-span-2",
  "Washroom Area": "col-span-3 sm:col-span-1",
  "Parking": "col-span-6 sm:col-span-3",
};
const ORDER = ["Block A", "Library", "Block B", "Cafeteria", "Lab Block", "Washroom Area", "Parking"];

const HEAT: Record<Hotspot["level"], { fill: string; mark: string; label: string }> = {
  low: { fill: "var(--heat-low)", mark: "var(--mark-low)", label: "Low" },
  moderate: { fill: "var(--heat-moderate)", mark: "var(--mark-moderate)", label: "Moderate" },
  high: { fill: "var(--heat-high)", mark: "var(--mark-high)", label: "High" },
  critical: { fill: "var(--heat-critical)", mark: "var(--mark-critical)", label: "Critical" },
};

function Legend() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-body">
      {Object.values(HEAT).map((h) => (
        <li key={h.label} className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-[2px]" style={{ background: h.mark }} />
          {h.label}
        </li>
      ))}
    </ul>
  );
}

export default function HotspotMap({ data }: { data: Hotspot[] }) {
  const by = Object.fromEntries(data.map((h) => [h.building, h]));
  return (
    <figure>
      <div className="grid auto-rows-[88px] grid-cols-6 gap-1">
        {ORDER.map((b) => {
          const h = by[b];
          if (!h) return null;
          return (
            <div key={b} className={`flex flex-col justify-between rounded-[4px] p-3 ${LAYOUT[b]}`} style={{ background: HEAT[h.level].fill }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium">{b}</span>
                <span className="text-[11px] text-body">{HEAT[h.level].label}</span>
              </div>
              <p className="num font-mono text-[12px] text-body">
                <span className="text-ink">{h.open}</span> open{h.critical > 0 && <>, <span className="text-[var(--crit-fg)]">{h.critical} critical</span></>}
              </p>
            </div>
          );
        })}
      </div>
      <figcaption className="sr-only">Open issues per campus area, shaded by heat level.</figcaption>
      <Legend />
    </figure>
  );
}

/** Compact hairline list for the dashboard sidebar column. */
export function HotspotList({ data }: { data: Hotspot[] }) {
  const sorted = [...data].sort((a, b) => b.open + 2 * b.critical - (a.open + 2 * a.critical));
  return (
    <ul className="divide-y divide-hairline border-y border-hairline">
      {sorted.map((h) => (
        <li key={h.building} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
          <span className="flex items-center gap-2.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-[2px]" style={{ background: HEAT[h.level].mark }} />
            {h.building}
          </span>
          <span className="num font-mono text-[12px] text-body">
            {h.open} open{h.critical > 0 && <span className="text-[var(--crit-fg)]">, {h.critical} crit</span>}
            <span className="ml-3 inline-block w-16 text-right text-mute">{HEAT[h.level].label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
