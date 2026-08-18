"use client";
import Link from "next/link";
import { BellRing, BookOpen, Trash2 } from "lucide-react";
import type { Z4SessionSummary } from "@/lib/z4chat/types";

const FALLBACK_AVATAR = "https://avatars.githubusercontent.com/u/0?v=4";

/** "3 phút trước", "hôm qua" - short enough to sit on one line next to the name. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.round(hours / 24);
  if (days === 1) return "hôm qua";
  if (days < 30) return `${days} ngày trước`;
  return new Date(then).toLocaleDateString("vi-VN");
}

export default function SessionCard({
  session,
  onDelete,
}: {
  session: Z4SessionSummary;
  onDelete: () => void;
}) {
  const unread = session.unreadCount > 0;

  return (
    <div
      className={`relative flex items-start gap-3.5 p-4 rounded-3xl border transition-colors ${
        unread
          ? "border-[#8B5CF6]/40 bg-gradient-to-br from-[#8B5CF6]/10 to-[#0a1628]"
          : "border-[#1e3a52] bg-gradient-to-br from-[#0f1e30] to-[#0a1628] hover:border-[#3B82F6]/40"
      }`}
    >
      <Link href={`/z4chat/${session.id}`} className="flex items-start gap-3.5 flex-1 min-w-0">
        <div className="relative shrink-0">
          <img
            src={session.character.avatarUrl || FALLBACK_AVATAR}
            alt={session.character.name}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#1e3a52]"
          />
          {unread && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#ec4899] text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-[#0a1628]">
              {session.unreadCount}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-white font-bold truncate">{session.character.name}</h3>
            <span className="text-[#475569] text-[11px] shrink-0">{relativeTime(session.updatedAt)}</span>
          </div>

          {session.story && (
            <p className="flex items-center gap-1.5 text-[#a78bfa] text-xs mt-0.5 truncate">
              <BookOpen size={11} className="shrink-0" />
              {session.story.title}
            </p>
          )}

          {unread ? (
            <p className="flex items-center gap-1.5 text-[#c4b5fd] text-[13px] font-semibold mt-1">
              <BellRing size={12} className="shrink-0" />
              {session.unreadCount === 1 ? "1 tin nhắn mới" : `${session.unreadCount} tin nhắn mới`}
            </p>
          ) : (
            <p className="text-[#94a3b8] text-[13px] leading-snug line-clamp-2 mt-1">
              {session.lastMessage
                ? `${session.lastMessage.role === "user" ? "Bạn: " : ""}${session.lastMessage.content.replace(/\*/g, "")}`
                : "Chưa có tin nhắn nào"}
            </p>
          )}
        </div>
      </Link>

      <button
        onClick={onDelete}
        className="p-2 rounded-xl text-[#475569] hover:text-[#f87171] hover:bg-[#1e293b] transition-colors shrink-0"
        aria-label="Xoá cuộc trò chuyện"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
