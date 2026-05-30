import type { AppTheme } from "@/lib/utils/settings";

const RANDOM_THEME_POOL = [
  "default",
  "ocean",
  "sunset",
  "purple",
  "yellow",
] as const;

type ResolvedTheme = (typeof RANDOM_THEME_POOL)[number];

function resolveRandomTheme(): ResolvedTheme {
  const index = Math.floor(Math.random() * RANDOM_THEME_POOL.length);
  return RANDOM_THEME_POOL[index] ?? "default";
}

export function resolveTheme(theme: AppTheme): ResolvedTheme {
  return theme === "random" ? resolveRandomTheme() : theme;
}

function applyResolvedTheme(theme: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "default") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
}

export function applyTheme(theme: AppTheme): void {
  applyResolvedTheme(resolveTheme(theme));
}
