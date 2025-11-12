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
  TrendingUp,
  Vote,
} from "lucide-react";
import { useEffect, useState } from "react";
import PostModal from "./PostModal";

const navItems = [
  { name: "Trang chủ", icon: HomeIcon, href: "/home" },
  { name: "Tìm kiếm", icon: Search, href: "/explore" },
  { name: "Nhắn tin", icon: MessageCircle, href: "/messages" },
  { name: "Chat với người lạ", icon: Heart, href: "/match" },
  { name: "Bình chọn - Thảo luận", icon: Vote, href: "/vote" },
  { name: "Hồ sơ của tôi", icon: User, href: "/profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { token } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  
  useEffect(() => setMounted(true), []);
  
  return (
    <aside className="w-72 min-w-[18rem] bg-gradient-to-br from-[#0a1628] to-[#071029] border-r border-[#1e293b] p-6 h-[calc(100vh-73px)] fixed top-[73px] left-0 overflow-hidden flex flex-col z-30">

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
        {mounted && token && (
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="hidden md:flex items-center gap-4 py-3 px-4 rounded-xl transition-all duration-200 w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-[1.02] mt-2"
          >
            Đăng bài viết
          </button>
        )}
      </nav>
      <div className="mt-auto">
        {!mounted ? (
          <div className="flex flex-col gap-2">
            <div className="w-full text-center py-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold opacity-50">Đăng nhập</div>
            <div className="w-full text-center py-2 rounded-xl border border-[#1e3a52] text-[#cbd5e1] opacity-50">Đăng ký</div>
          </div>
        ) : !token ? (
          <div className="flex flex-col gap-2">
            <Link href="/login" className="w-full text-center py-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold">Đăng nhập</Link>
            <Link href="/register" className="w-full text-center py-2 rounded-xl border border-[#1e3a52] text-[#cbd5e1] hover:bg-[#1e293b] transition-colors">Đăng ký</Link>
          </div>
        ) : null}
      </div>
      <PostModal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} />
    </aside>
  );
}


