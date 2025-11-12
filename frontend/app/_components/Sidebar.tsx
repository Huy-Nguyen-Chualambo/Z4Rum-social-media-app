"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import {
  Home as HomeIcon,
  Search,
  MessageCircle,
  Heart,
  User,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Home", icon: HomeIcon, href: "/home" },
  { name: "Explore", icon: Search, href: "/explore" },
  { name: "Messages", icon: MessageCircle, href: "/messages" },
  { name: "Matches", icon: Heart, href: "/matches" },
  { name: "Profile", icon: User, href: "/profile" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <aside className="w-72 min-w-[18rem] bg-gradient-to-br from-[#0a1628] to-[#071029] border-r border-[#1e293b] p-6 h-screen sticky top-0">
      <div className="flex items-center gap-3 mb-10">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} className="w-12 h-12 rounded-xl object-cover ring-2 ring-[#1e3a52]" alt="avatar" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] via-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
            Z
          </div>
        )}
        <div>
          <h1 className="text-white text-xl font-bold tracking-tight">Z4rum</h1>
          {user ? <div className="text-[#94a3b8] text-xs">Người dùng: {user.username}</div> : <div className="text-[#94a3b8] text-xs">Welcome</div>}
        </div>
      </div>

      <nav className="flex flex-col gap-2 mb-8">
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
      {token ? (
        <div className="flex flex-col gap-3">
          <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-[1.02] transition-all duration-200">
            Post
          </button>
          <button onClick={() => { logout(); router.replace("/login"); }} className="w-full py-2 rounded-xl border border-[#1e3a52] text-[#cbd5e1] hover:bg-[#1e293b] transition-colors">
            Logout
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Link href="/login" className="w-full text-center py-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold">Sign in</Link>
          <Link href="/register" className="w-full text-center py-2 rounded-xl border border-[#1e3a52] text-[#cbd5e1] hover:bg-[#1e293b] transition-colors">Sign up</Link>
        </div>
      )}
    </aside>
  );
}


