"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, Heart, User, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import PostModal from "./PostModal";

const items = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/explore", icon: Search, label: "Explore" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/matches", icon: Heart, label: "Matches" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { token } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[#1e293b] bg-[#0a0f1e]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0f1e]/80 md:hidden">
        <div className="relative flex items-center justify-around py-2">
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

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[#1e293b] bg-[#0a0f1e]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0f1e]/80 md:hidden">
        <div className="relative flex items-center justify-around py-2">
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
          {token && (
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="absolute -top-10 right-4 w-11 h-11 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-110 transition-all duration-200 flex items-center justify-center z-50"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </nav>
      <PostModal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} />
    </>
  );
}


