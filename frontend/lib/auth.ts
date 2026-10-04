"use client";

import { useSyncExternalStore } from "react";

// The session token lives only in an httpOnly cookie set by the API; JavaScript never sees it.
// We cache the (non-secret) user profile so the UI renders instantly, and re-validate with /api/auth/me.
export type User = { id: number; name: string; email: string; role: "student" | "admin" };
export type Session = { user: User };

const KEY = "campusfix.user";
const listeners = new Set<() => void>();
let cached: { raw: string | null; value: Session | null } = { raw: null, value: null };
let loggingOut = false;

function read(): Session | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw !== cached.raw) {
    let value: Session | null = null;
    try { value = raw ? { user: JSON.parse(raw) as User } : null; } catch { value = null; }
    cached = { raw, value };
  }
  return cached.value;
}

function emit() {
  listeners.forEach((l) => l());
}

export function saveSession(s: Session) {
  try { localStorage.setItem(KEY, JSON.stringify(s.user)); } catch {}
  emit();
}

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch {}
  emit();
}

/** True while a user-initiated logout is in progress (guards send home, not to /login). */
export function isLoggingOut() {
  return loggingOut;
}

export async function logout(apiLogout: () => Promise<unknown>) {
  loggingOut = true;
  try { await apiLogout(); } catch {}
  clearSession();
  setTimeout(() => { loggingOut = false; }, 1000);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

/** Current session; `undefined` during SSR/hydration (unknown), `null` when logged out. */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

export const DEMO = {
  student: { email: "student@campusfix.dev", password: "student123" },
  admin: { email: "admin@campusfix.dev", password: "admin123" },
};

export const homeFor = (u: User) => (u.role === "admin" ? "/admin" : "/report");
