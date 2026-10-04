"use client";

import { useTheme } from "./theme";

// Chart colours follow the CSS tokens in globals.css (SVG attributes can't read var()).
const LIGHT = { ink: "#171717", body: "#4d4d4d", mute: "#888888", hairline: "#ebebeb", accent: "#0761d1", crit: "#a30000" };
const DARK = { ink: "#ededed", body: "#a1a1a1", mute: "#7a7a7a", hairline: "#242424", accent: "#52a8ff", crit: "#ff8a8a" };

export function useTokens() {
  return useTheme() === "dark" ? DARK : LIGHT;
}
