"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { themes, type ThemeName, type ThemeConfig } from "@/lib/theme";

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
    applyThemeProperties(currentTheme);
  }, [currentTheme]);

  const setTheme = (themeName: ThemeName) => {
    const newTheme = themes[themeName];
    applyThemeProperties(newTheme);
  };

  return (
    <ThemeContext value={{ theme: currentTheme, setTheme }}>
      {children}
    </ThemeContext>
  );
}
