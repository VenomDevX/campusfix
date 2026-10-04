"use client";

import { Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import { setTheme, useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" onClick={() => setTheme(next)} disabled={!theme}
      aria-label={theme ? `Switch to ${next} theme` : "Toggle theme"} title={theme ? `Switch to ${next} theme` : undefined}
      className="btn btn-sm btn-icon text-body hover:bg-inset hover:text-ink">
      {theme === "dark" ? <Sun aria-hidden="true" size={18} weight="bold" /> : <Moon aria-hidden="true" size={18} weight="bold" />}
    </button>
  );
}
