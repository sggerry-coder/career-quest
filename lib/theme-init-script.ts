import { themes } from "@/lib/theme";

/**
 * Theme names the pre-paint script in app/layout.tsx is allowed to restore.
 * Generated from `themes` (not hand-copied) so a new theme can never
 * silently fall out of sync with the pre-paint whitelist -- see
 * lib/__tests__/theme-cache.test.ts for the drift test.
 */
export const THEME_INIT_SCRIPT_NAMES = Object.keys(themes);

/**
 * Build the inline script that restores the cached class theme
 * synchronously before first paint, so a returning named student never
 * sees a flash of the wrong colour. Runs inline at the top of <body>,
 * before any module loads in the browser -- hence a plain string, not a
 * function reference. The Supabase profile fetch remains the source of
 * truth and corrects drift after hydration. Keep the key in sync with
 * THEME_CACHE_KEY in lib/theme.ts.
 */
export function buildThemeInitScript(): string {
  return `try{var t=localStorage.getItem("cq-theme");if(${JSON.stringify(THEME_INIT_SCRIPT_NAMES)}.indexOf(t)!==-1){document.documentElement.setAttribute("data-theme",t);}}catch(e){}`;
}
