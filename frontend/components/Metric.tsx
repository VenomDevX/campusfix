export default function Metric({ label, value, hint, tone }: {
  label: string; value: string | number; hint?: string; tone?: "critical";
}) {
  return (
    <div className="px-5 py-4 first:pl-0">
      <p className="text-[13px] text-body">{label}</p>
      <p className={`num mt-1 font-mono text-[28px] font-medium leading-9 tracking-[-0.04em] ${tone === "critical" ? "text-[var(--crit-fg)]" : "text-ink"}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[12px] text-mute">{hint}</p>}
    </div>
  );
}
