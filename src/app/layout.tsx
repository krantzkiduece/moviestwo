// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import SessionBar from "../components/SessionBar";
import SearchBar from "../components/SearchBar";

export const metadata: Metadata = {
  title: "CineCircle",
  description: "Friends’ movie picks, ratings, and ideas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen">
        <div className="max-w-6xl mx-auto p-4">
          {/* Site header with Search */}
          <header className="mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-6">
                <a href="/" className="text-xl font-bold tracking-wide hover:opacity-90">
                  🎬 CineCircle
                </a>
                <nav className="text-sm space-x-4 hidden sm:block">
                  <a href="/" className="hover:underline">Home</a>
                  <a href="/trending" className="hover:underline">Trending</a>
                  <a href="/friends" className="hover:underline">Friends</a>
                  <a href="/profile/me" className="hover:underline">My Profile</a>
                  <a href="/admin" className="hover:underline">Admin</a>
                </nav>
              </div>

              {/* Search movies & actors */}
              <div className="w-full sm:max-w-xl">
                <SearchBar />
              </div>

              {/* On small screens, show nav under search */}
              <nav className="text-sm space-x-4 sm:hidden">
                <a href="/" className="hover:underline">Home</a>
                <a href="/trending" className="hover:underline">Trending</a>
                <a href="/friends" className="hover:underline">Friends</a>
                <a href="/profile/me" className="hover:underline">My Profile</a>
                <a href="/admin" className="hover:underline">Admin</a>
              </nav>
            </div>
          </header>

          {/* Session bar (current user + Logout) */}
          <SessionBar />

          {/* Page content */}
          <main className="space-y-6">{children}</main>

          <footer className="mt-12 text-xs text-gray-500">
            Built with TMDb data (poster & metadata). This product uses the TMDB API but is not endorsed or certified by TMDb.
          </footer>
        </div>
      </body>
    </html>
  );
}
