"use client";

import { Bell } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, timeAgo } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";

/** In-app notifications for ticket updates. Polls every 15s; opening marks all read. */
export default function NotificationBell() {
  const { data, reload } = usePoll(api.notifications, 15000);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread) {
      await api.markNotificationsRead().catch(() => {});
      reload();
    }
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} aria-haspopup="true" aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="btn btn-sm btn-icon relative text-body hover:bg-inset hover:text-ink">
        <Bell aria-hidden="true" size={18} weight="bold" />
        {unread > 0 && (
          <span aria-hidden="true" className="num absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-[4px] bg-[var(--crit-fg)] px-1 font-mono text-[10px] font-medium leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-4 top-[68px] z-40 rounded-[6px] md:absolute md:inset-x-auto md:right-0 md:top-[calc(100%+8px)] md:w-80 border border-hairline bg-surface shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]">
          <p className="border-b border-hairline px-3 py-2.5 text-[13px] font-medium">Notifications</p>
          {!data?.items.length ? (
            <p className="px-3 py-6 text-center text-[13px] text-mute">No updates yet. You&apos;ll hear here when your tickets move.</p>
          ) : (
            <ul aria-live="polite" className="max-h-80 divide-y divide-hairline overflow-y-auto overscroll-contain">
              {data.items.map((n) => (
                <li key={n.id}>
                  <Link href={`/track/${n.issue_id}`} onClick={() => setOpen(false)}
                    className="flex gap-2.5 px-3 py-2.5 text-[13px] hover:bg-inset">
                    <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 ${n.read ? "bg-transparent" : "bg-accent"}`} />
                    <span className="min-w-0">
                      <span className="block text-ink">{n.message}</span>
                      <span className="t-caption num">{timeAgo(n.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
