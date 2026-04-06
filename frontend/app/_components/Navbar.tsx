"use client";
import React from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";

export default function Navbar() {
  const { user } = useAuthStore();

  return (
    <nav className="w-full bg-gradient-to-br from-[#0a1628] to-[#071029] border-b border-[#1e293b] sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#1e3a52]" alt="avatar" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] via-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
              Z
            </div>
          )}
          <div>
            <h1 className="text-white text-lg font-bold tracking-tight">Z4rum</h1>
            {user ? <div className="text-[#94a3b8] text-xs">Người dùng: {user.username}</div> : <div className="text-[#94a3b8] text-xs">Welcome</div>}
          </div>
        </div>
      </div>
    </nav>
  );
}

