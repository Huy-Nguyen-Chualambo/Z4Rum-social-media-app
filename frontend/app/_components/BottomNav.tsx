"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, Heart, User } from "lucide-react";

const items = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/explore", icon: Search, label: "Explore" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/matches", icon: Heart, label: "Matches" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[#1e293b] bg-[#0a0f1e]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0f1e]/80 md:hidden">
      <div className="flex items-center justify-around py-2">
        {items.map((i) => {
          const active = pathname?.startsWith(i.href);
          const Icon = i.icon;
          return (
            <Link key={i.href} href={i.href} className="flex flex-col items-center gap-1 px-3 py-1">
              <Icon size={22} className={active ? "text-[#60A5FA]" : "text-[#94a3b8]"} />
              <span className={`text-xs ${active ? "text-white" : "text-[#94a3b8]"}`}>{i.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


