import type { Metadata } from "next";
import { CacheProvider } from "@/context/CacheContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { MuiProvider } from "@/components/layout/MuiProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "NuzTracker - Nuzlocke Run Tracker",
  description:
    "Track your Pokémon Nuzlocke runs with interactive maps and team management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <MuiProvider>
          <LanguageProvider>
            <CacheProvider>{children}</CacheProvider>
          </LanguageProvider>
        </MuiProvider>
      </body>
    </html>
  );
}
