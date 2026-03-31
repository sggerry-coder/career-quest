import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Career Quest",
  description: "Discover your career path through a gamified quest",
};

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
        <ThemeProvider initialTheme="purple-teal">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
