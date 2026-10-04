"use client";

import { CaretDown, List, SignOut, X } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, logout as endSession, useSession, type User } from "@/lib/auth";
import NotificationBell from "./NotificationBell";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

type NavLink = { href: string; label: string; exact?: boolean };

// Primary destinations per role. Actions (report, log out) live on the right, not in this list.
const NAV: Record<"guest" | "student" | "admin", NavLink[]> = {
  guest: [{ href: "/report", label: "Report" }, { href: "/track", label: "Track" }],
  student: [{ href: "/my-reports", label: "My reports" }, { href: "/track", label: "Track" }],
  admin: [
    { href: "/admin", label: "Dashboard", exact: true },
    { href: "/admin/issues", label: "Tickets" },
    { href: "/admin/analytics", label: "Analytics" },
  ],
};

const isActive = (path: string, l: NavLink) => (l.exact ? path === l.href : path.startsWith(l.href));
const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export default function Header() {
  const path = usePathname();
  const router = useRouter();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = session ? session.user.role : "guest";
  const links = NAV[role];

  // The cached profile may outlive the cookie (expired, server restarted): confirm once per page load.
  const userId = session?.user.id;
  useEffect(() => {
    if (userId) api.me().catch(() => clearSession());
  }, [userId]);

  async function logout() {
    setMenuOpen(false);
    await endSession(api.logout);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-canvas">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="ml-8 hidden h-full items-center gap-1 md:flex">
          {links.map((l) => {
            const active = isActive(path, l);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
                className={`relative flex h-full items-center px-3 text-[14px] transition-colors ${
                  active ? "text-ink" : "text-body hover:text-ink"
                }`}>
                {l.label}
                {active && <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-px bg-ink" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* One bell for both layouts (it polls, so never mount it twice). */}
          {session && <NotificationBell />}
          {/* Min-width slot: the session resolves after hydration, so reserve space to avoid layout shift. */}
          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {session === null && (
              <>
                <Link href="/login" className="btn btn-secondary btn-sm">Log in</Link>
                <Link href="/signup" className="btn btn-primary btn-sm">Sign up</Link>
              </>
            )}
            {session && (
              <>
                {session.user.role === "student" && <Link href="/report" className="btn btn-primary btn-sm">Report issue</Link>}
                <AccountMenu user={session.user} onLogout={logout} />
              </>
            )}
          </div>
          <div className="md:hidden"><ThemeToggle /></div>
          <button type="button" className="btn btn-secondary btn-sm btn-icon md:hidden" aria-expanded={menuOpen}
            aria-controls="mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <X aria-hidden="true" size={18} /> : <List aria-hidden="true" size={18} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-hairline bg-canvas md:hidden">
          <nav aria-label="Mobile" className="mx-auto max-w-[1200px] px-4 py-2 sm:px-6">
            <ul className="divide-y divide-hairline">
              {[...links, ...(session?.user.role === "student" ? [{ href: "/report", label: "Report issue" }] : [])].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={() => setMenuOpen(false)} aria-current={isActive(path, l) ? "page" : undefined}
                    className={`flex h-12 items-center text-[15px] ${isActive(path, l) ? "font-medium text-ink" : "text-body"}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-hairline py-4">
              {session ? (
                <>
                  <div className="min-w-0 text-[14px]">
                    <p className="truncate font-medium">{session.user.name}</p>
                    <p className="truncate text-mute">{session.user.email}</p>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>Log out</button>
                </>
              ) : (
                <div className="grid w-full grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="btn btn-secondary">Log in</Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)} className="btn btn-primary">Sign up</Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/** Avatar button with a small account popover. Closes on outside click and Escape. */
function AccountMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const item = "flex h-9 w-full items-center gap-2 rounded-[4px] px-2 text-left text-[14px] text-body hover:bg-inset hover:text-ink";
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={`Account: ${user.name}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded-[6px] pl-1 pr-1.5 text-body transition-colors hover:bg-inset hover:text-ink">
        <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-[4px] bg-ink font-mono text-[11px] font-medium text-on-ink">
          {initials(user.name)}
        </span>
        <CaretDown aria-hidden="true" size={12} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-[6px] border border-hairline bg-surface p-1.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]">
          <div className="border-b border-hairline px-2 pb-2.5 pt-1.5">
            <p className="truncate text-[14px] font-medium">{user.name}</p>
            <p className="truncate text-[13px] text-mute">{user.email}</p>
            <p className="t-caption mt-1">{user.role === "admin" ? "Maintenance admin" : "Student"}</p>
          </div>
          <div className="py-1">
            {user.role === "admin" ? (
              <Link role="menuitem" href="/report" className={item} onClick={() => setOpen(false)}>New report</Link>
            ) : (
              <Link role="menuitem" href="/my-reports" className={item} onClick={() => setOpen(false)}>My reports</Link>
            )}
            <button role="menuitem" type="button" className={item} onClick={onLogout}>
              <SignOut aria-hidden="true" size={16} /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
