import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NuzTracker - Nuzlocke Run Tracker',
  description: 'Track your Pokémon Nuzlocke runs with interactive maps and team management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-gray-900 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
