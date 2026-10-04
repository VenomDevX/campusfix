"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const KEY = "campusfix.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

/** Runs before paint (inlined in <head>) so a saved theme never flashes. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function effective(): Theme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const m = window.matchMedia(DARK_QUERY);
  m.addEventListener("change", cb);
  return () => { listeners.delete(cb); m.removeEventListener("change", cb); };
}

/** Effective theme; null during SSR/hydration. */
export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribe, effective, () => null);
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch {}
  listeners.forEach((l) => l());
}
