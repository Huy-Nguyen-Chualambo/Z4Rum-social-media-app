"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import {
  Home as HomeIcon,
  Search,
  MessageCircle,
  Heart,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import PostModal from "./PostModal";

const navItems = [
  { name: "Trang chủ", icon: HomeIcon, href: "/home" },
  { name: "Khám phá", icon: Search, href: "/explore" },
  { name: "Tin nhắn", icon: MessageCircle, href: "/messages" },
  { name: "Chat với người lạ", icon: Heart, href: "/matches" },
  { name: "Hồ sơ của tôi", icon: User, href: "/profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { token } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return null;
  
  return (
    <aside className="w-72 min-w-[18rem] bg-gradient-to-br from-[#0a1628] to-[#071029] border-r border-[#1e293b] p-6 h-screen fixed top-0 left-0 overflow-hidden flex flex-col">
      <nav className="flex flex-col gap-2 mb-8 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-[#3B82F6]/20 to-[#8B5CF6]/20 text-white border border-[#3B82F6]/30"
                  : "text-[#94a3b8] hover:bg-[#1e293b] hover:text-white"
              }`}
            >
              <Icon size={20} className={isActive ? "text-[#60A5FA]" : "group-hover:text-[#60A5FA] transition-colors"} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        {token ? (
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="hidden md:block w-full py-3.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-[1.02] transition-all duration-200"
          >
            Post
          </button>
        ) : (
          <div className="hidden md:flex flex-col gap-2">
            <Link href="/login" className="w-full text-center py-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold">Sign in</Link>
            <Link href="/register" className="w-full text-center py-2 rounded-xl border border-[#1e3a52] text-[#cbd5e1] hover:bg-[#1e293b] transition-colors">Sign up</Link>
          </div>
        )}
      </div>
      <PostModal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} />
    </aside>
  );
}


