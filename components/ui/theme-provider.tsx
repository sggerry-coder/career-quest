"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import {
  themes,
  cacheThemeName,
  readCachedThemeName,
  type ThemeName,
  type ThemeConfig,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (themeName: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes["blue-indigo"],
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyThemeProperties(theme: ThemeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme.name);
  root.style.setProperty("--theme-primary", theme.primary);
  root.style.setProperty("--theme-accent", theme.accent);
  root.style.setProperty("--theme-glow", theme.glow);
  root.style.setProperty("--theme-border-radius", theme.borderRadius);
}

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeName;
}

export function ThemeProvider({
  children,
  initialTheme = "blue-indigo",
}: ThemeProviderProps) {
  const currentTheme = themes[initialTheme];

  useEffect(() => {
    // Prefer the cached class theme (already applied pre-paint by the
    // inline script in the root layout) over the static default, so
    // hydration never flips a returning student back to purple (P2.5).
    const cached = readCachedThemeName();
    applyThemeProperties(cached ? themes[cached] : currentTheme);
  }, [currentTheme]);

  const setTheme = (themeName: ThemeName) => {
    const newTheme = themes[themeName];
    cacheThemeName(themeName);
    applyThemeProperties(newTheme);
  };

  return (
    <ThemeContext value={{ theme: currentTheme, setTheme }}>
      {children}
    </ThemeContext>
  );
}
