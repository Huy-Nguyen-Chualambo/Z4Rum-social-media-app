"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useZ4chatStore } from "@/lib/store/useZ4chatStore";
import {
  Home as HomeIcon,
  Search,
  MessageCircle,
  Heart,
  User,
  Vote,
  Sparkles,
  Globe,
} from "lucide-react";
import { useEffect, useState } from "react";
import PostModal from "./PostModal";

const navItems = [
  { name: "Z4world", icon: Globe, href: "/z4world" },
  { name: "Trang chủ", icon: HomeIcon, href: "/home" },
  { name: "Tìm kiếm", icon: Search, href: "/explore" },
  { name: "Nhắn tin", icon: MessageCircle, href: "/messages" },
  { name: "Chat với người lạ", icon: Heart, href: "/match" },
  { name: "Z4chat", icon: Sparkles, href: "/z4chat" },
  { name: "Bình chọn - Thảo luận", icon: Vote, href: "/vote" },
  { name: "Hồ sơ của tôi", icon: User, href: "/profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { token } = useAuthStore();
  const z4chatUnread = useZ4chatStore((state) => state.unreadTotal);
  const [mounted, setMounted] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <aside className="sticky top-14 flex h-[calc(100dvh-56px)] flex-col overflow-y-auto px-3 py-5 text-sm">
      <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Diễn đàn / Z4rum</p>

      <nav className="flex flex-col gap-0.5 mb-5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          // Only rendered after mount: the count comes from an API call, so the
          // server render has nothing to show and must not disagree.
          const badge = mounted && item.href === "/z4chat" ? z4chatUnread : 0;
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-sm transition-all duration-200 group ${isActive
                  ? "bg-[#1c1c1c] text-white border-l-2 border-blue-500"
                  : "text-[#a3a3a3] hover:bg-[#292929] hover:text-white"
                }`}
            >
              <Icon size={20} className={isActive ? "text-[#3B82F6]" : "group-hover:text-[#3B82F6] transition-colors"} />
              <span className="font-medium">{item.name}</span>
              {badge > 0 && (
                <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          );
        })}
        {mounted && token && (
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="hidden md:flex items-center gap-3 py-2.5 px-3 rounded-sm transition-all duration-200 w-full bg-blue-500 text-white font-semibold     mt-2"
          >
            Đăng bài viết
          </button>
        )}
      </nav>
      <div className="mt-auto border-t border-neutral-800 pt-4">
        <p className="mb-3 px-1 text-xs leading-5 text-neutral-500">Có chuyện gì? Kể Bảnh nghe.<br />Một góc mạng của anh em mình.</p>
        {!mounted ? (
          <div className="flex flex-col gap-2">
            <div className="w-full text-center py-2 rounded-sm bg-blue-500 text-white font-semibold opacity-50">Đăng nhập</div>
            <div className="w-full text-center py-2 rounded-sm border border-[#303030] text-[#dedede] opacity-50">Đăng ký</div>
          </div>
        ) : !token ? (
          <div className="flex flex-col gap-2">
            <Link href="/login" className="w-full text-center py-2 rounded-sm bg-blue-500 text-white font-semibold">Đăng nhập</Link>
            <Link href="/register" className="w-full text-center py-2 rounded-sm border border-[#303030] text-[#dedede] hover:bg-[#292929] transition-colors">Đăng ký</Link>
          </div>
        ) : null}
      </div>
      <PostModal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} />
    </aside>
  );
}


