// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CineCircle",
  description: "Friends’ movie & TV picks, ratings, watchlists, and top 5s",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {/* Top bar */}
        <header className="border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="font-bold tracking-wide hover:opacity-90">
              CineCircle
            </a>
            <nav className="flex gap-5 text-sm">
              <a href="/" className="hover:underline">Home</a>
              <a href="/trending" className="hover:underline">Trending</a>
              <a href="/tv" className="hover:underline">TV</a>
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
