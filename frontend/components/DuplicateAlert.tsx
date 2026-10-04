import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { img } from "@/lib/api";
import type { Analysis } from "@/types";

export default function DuplicateAlert({ a, busy, onSupport, onCreateNew }: {
  a: Analysis; busy: boolean; onSupport: () => void; onCreateNew: () => void;
}) {
  const reporters = (a.duplicate_support_count ?? 0) + 1;
  return (
    <section aria-live="polite" className="border-l-2 border-[var(--high-fg)] pl-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-sub">This issue is already reported.</h2>
        <span className="t-caption num">{Math.round((a.similarity ?? 0) * 100)}% match</span>
      </div>
      <div className="mt-4 flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(a.duplicate_image_url)} alt={a.duplicate_title ?? "Existing issue photo"} width={112} height={84}
          className="h-[84px] w-[112px] shrink-0 rounded-[4px] object-cover" />
        <div className="min-w-0 text-[14px]">
          <p className="font-mono text-[12px] text-mute" translate="no">{a.duplicate_issue_id}</p>
          <p className="truncate font-medium">{a.duplicate_title}</p>
          <p className="mt-1 text-body">
            {Math.round((a.image_similarity ?? 0) * 100)}% image similarity, same category and area.
            {" "}{reporters} {reporters === 1 ? "student has" : "students have"} reported it.
          </p>
        </div>
      </div>
      <p className="mt-4 max-w-[60ch] text-[14px] text-body">
        Adding your report raises its priority and keeps the team from visiting the same fault twice.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onSupport}>
          {busy && <CircleNotch aria-hidden="true" className="animate-spin" size={16} />} Support existing ticket
        </button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCreateNew}>Create a new ticket</button>
      </div>
    </section>
  );
}
