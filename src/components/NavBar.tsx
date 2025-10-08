"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home" },
  { href: "/trending", label: "Trending" },
  { href: "/search", label: "Search" },
  { href: "/profile/me", label: "My Profile" },
  { href: "/friends", label: "Friends" }
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="container flex gap-4 overflow-x-auto">
        {tabs.map(t => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`py-3 ${active ? "text-white font-semibold" : "text-gray-300"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
