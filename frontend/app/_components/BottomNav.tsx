"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, Heart, User, Plus, Vote, Sparkles, Menu, LogIn, Globe } from "lucide-react";
import { useSyncExternalStore, useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useZ4chatStore } from "@/lib/store/useZ4chatStore";
import PostModal from "./PostModal";

const subscribe = () => () => {};
const items = [
  { name: "Trang chủ", icon: Home, href: "/home" },
  { name: "Z4chat", icon: Sparkles, href: "/z4chat" },
  { name: "Z4world", icon: Globe, href: "/z4world" },
  { name: "Chat lạ", icon: Heart, href: "/match" },
];
const moreItems = [
  { name: "Tin nhắn", icon: MessageCircle, href: "/messages" },
  { name: "Tìm kiếm", icon: Search, href: "/explore" },
  { name: "Bình chọn – Thảo luận", icon: Vote, href: "/vote" },
  { name: "Hồ sơ của tôi", icon: User, href: "/profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { token } = useAuthStore();
  const unread = useZ4chatStore((state) => state.unreadTotal);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const moreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <>
      <nav aria-label="Điều hướng chính" className="mobile-nav fixed bottom-0 inset-x-0 z-40 border-t border-neutral-800 bg-[#101010] md:hidden">
        <div className="grid h-16 grid-cols-5">
          {items.map(({ name, icon: Icon, href }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`relative flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] ${active ? "text-blue-500" : "text-neutral-400"}`}>
                <Icon size={21} /><span>{name}</span>
                {href === "/z4chat" && mounted && unread > 0 && (
                  <span aria-label={`${unread} tin Z4chat chưa đọc`} className="absolute right-2 top-1 min-w-4 rounded-full bg-blue-500 px-1 text-center text-[10px] text-white">{unread > 9 ? "9+" : unread}</span>
                )}
              </Link>
            );
          })}
          <details key={pathname} className="group relative">
            <summary className={`relative flex h-16 cursor-pointer list-none flex-col items-center justify-center gap-1 text-[10px] [&::-webkit-details-marker]:hidden ${moreActive ? "text-blue-500" : "text-neutral-400"}`}>
              <Menu size={21} /><span>Thêm</span>
            </summary>
            <div className="absolute bottom-full right-2 mb-2 w-64 max-w-[calc(100vw-16px)] border border-neutral-700 bg-[#181818] p-2">
              {moreItems.map(({ name, icon: Icon, href }) => (
                <Link key={href} href={href} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} aria-current={pathname.startsWith(href) ? "page" : undefined} className="flex min-h-12 items-center gap-3 px-3 text-sm hover:bg-neutral-800">
                  <Icon size={18} />{name}
                </Link>
              ))}
              {mounted && token ? (
                <button onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setIsPostModalOpen(true); }} className="flex min-h-12 w-full items-center gap-3 border-t border-neutral-700 px-3 text-sm text-blue-500"><Plus size={18} />Đăng bài viết</button>
              ) : <Link href="/login" className="flex min-h-12 items-center gap-3 border-t border-neutral-700 px-3 text-sm text-blue-500"><LogIn size={18} />Đăng nhập</Link>}
            </div>
          </details>
        </div>
      </nav>
      <PostModal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} />
    </>
  );
}
