import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { MotionProvider } from "@/components/ui/motion-provider";
import { buildThemeInitScript } from "@/lib/theme-init-script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Career Quest",
  description: "Discover your career path through a gamified quest",
};

// Instant theme (P2.5): restore the cached class theme synchronously before
// first paint so returning students (any of the 3 original palettes or the
// 8 class palettes) never see a purple flash. Runs inline at the top of
// <body>; the Supabase profile fetch remains the source of truth and
// corrects drift after hydration. See lib/theme-init-script.ts for the
// whitelist, which is generated from `themes` (lib/theme.ts) rather than
// hand-copied here, so it can never silently drift.
const themeInitScript = buildThemeInitScript();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={inter.className}
        style={{
          background: "linear-gradient(180deg, #0f0a1e, #1a1035)",
          minHeight: "100vh",
        }}
      >
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Framer runs in JavaScript, so the prefers-reduced-motion block in
            globals.css never reached a single thing that actually moves in this
            app. See components/ui/motion-provider. */}
        <MotionProvider>
          <ThemeProvider initialTheme="purple-teal">
            {children}
          </ThemeProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
