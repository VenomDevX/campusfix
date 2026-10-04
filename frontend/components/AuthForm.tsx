"use client";

import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { DEMO, homeFor, saveSession, type Session } from "@/lib/auth";

/** Shared login / sign-up form with one-click demo accounts. */
export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  function done(s: Session) {
    saveSession(s);
    const next = params.get("next");
    // Only follow same-site relative paths, and never send a student to an admin page.
    const safe = next && next.startsWith("/") && !next.startsWith("//") && !(next.startsWith("/admin") && s.user.role !== "admin");
    router.replace(safe ? next : homeFor(s.user));
  }

  async function run(key: string, fn: () => Promise<Session>) {
    setBusy(key); setError("");
    try {
      done(await fn());
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    const password = String(f.get("password") ?? "");
    if (mode === "signup") run("form", () => api.signup(String(f.get("name") ?? ""), email, password));
    else run("form", () => api.login(email, password));
  }

  const login = mode === "login";
  return (
    <div className="mx-auto grid grid-cols-1 max-w-[1200px] gap-16 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:py-24">
      <div>
        <h1 className="t-section">{login ? "Log in" : "Create an account"}</h1>
        <p className="mt-2 text-body">
          {login ? "Report issues and follow them until they are fixed." : "Student accounts can report issues and track their progress."}
        </p>

        <form onSubmit={submit} className="mt-10 space-y-5">
          {!login && (
            <div>
              <label htmlFor="name" className="label">Full name</label>
              <input id="name" name="name" className="field" autoComplete="name" required minLength={2} placeholder="e.g. Aarav Mehta…" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="label">College email</label>
            <input id="email" name="email" type="email" className="field" autoComplete="email" spellCheck={false} required
              placeholder="name@college.edu…" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" name="password" type="password" className="field" required minLength={6}
              autoComplete={login ? "current-password" : "new-password"} />
            {!login && <p className="mt-1.5 text-[12px] text-mute">At least 6 characters.</p>}
          </div>
          {error && <p role="alert" className="border-l-2 border-[var(--crit-fg)] pl-3 text-[14px] text-[var(--crit-fg)]">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={!!busy}>
            {busy === "form" && <CircleNotch aria-hidden="true" size={16} className="animate-spin" />}
            {login ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-[14px] text-body">
          {login ? <>New here? <Link href="/signup" className="link">Create an account</Link></>
            : <>Already have an account? <Link href="/login" className="link">Log in</Link></>}
        </p>
      </div>

      <section aria-labelledby="demo" className="lg:border-l lg:border-hairline lg:pl-16">
        <h2 id="demo" className="t-sub">Demo accounts</h2>
        <p className="mt-2 max-w-[48ch] text-[14px] text-body">Skip the form and explore CampusFix with seeded data.</p>
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {([
            ["student", "Student", "Report issues, see duplicates, follow your tickets."],
            ["admin", "Maintenance admin", "Priority queue, status changes, analytics."],
          ] as const).map(([key, title, text]) => (
            <li key={key} className="flex flex-wrap items-center justify-between gap-4 py-5">
              <div className="min-w-0">
                <p className="font-medium">{title}</p>
                <p className="text-[14px] text-body">{text}</p>
                <p className="mt-1 font-mono text-[12px] text-mute" translate="no">{DEMO[key].email} / {DEMO[key].password}</p>
              </div>
              <button type="button" className="btn btn-secondary" disabled={!!busy}
                onClick={() => run(key, () => api.login(DEMO[key].email, DEMO[key].password))}>
                {busy === key && <CircleNotch aria-hidden="true" size={16} className="animate-spin" />}
                Continue as {key}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
