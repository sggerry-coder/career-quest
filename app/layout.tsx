import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Career Quest",
  description: "Discover your career path through a gamified quest",
};

// Instant theme (P2.5): restore the cached class theme synchronously before
// first paint so returning magenta/blue students never see a purple flash.
// Runs inline at the top of <body>; the Supabase profile fetch remains the
// source of truth and corrects drift after hydration. Keep the key in sync
// with THEME_CACHE_KEY in lib/theme.ts.
const themeInitScript = `try{var t=localStorage.getItem("cq-theme");if(t==="purple-teal"||t==="magenta-violet"||t==="blue-indigo"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}`;

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
        <ThemeProvider initialTheme="purple-teal">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
