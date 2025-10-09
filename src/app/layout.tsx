// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CineCircle",
  description: "A simple Rotten Tomatoes–style movie database for friends",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-gray-100 min-h-screen">
        {/* Header / Top Nav */}
        <header className="border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="text-xl font-bold hover:opacity-90">
              CineCircle
            </Link>

            <nav className="flex items-center gap-4 text-sm">
              <Link className="hover:text-blue-400" href="/search">
                Search
              </Link>
              <Link className="hover:text-blue-400" href="/trending">
                Trending
              </Link>
              <Link className="hover:text-blue-400" href="/friends">
                Friends
              </Link>
              <Link className="hover:text-blue-400" href="/profile/me">
                My Profile
              </Link>
              <Link className="hover:text-blue-400" href="/admin">
                Admin
              </Link>
            </nav>
          </div>
        </header>

        {/* Main content container */}
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
