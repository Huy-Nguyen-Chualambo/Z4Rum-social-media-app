"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/app/_components/RequireAuth";
import { useToast } from "@/lib/ui/toast";
import { messageApi } from "@/lib/api/messageApi";
import { useSocketStore } from "@/lib/store/useSocketStore";
import { useAuthStore } from "@/lib/store/useAuthStore";

type Conversation = { peer: { id: string; username: string; avatarUrl?: string }, lastMessage: { id: string; content: string; createdAt: string; senderId: string; receiverId?: string } };
const formatTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export default function MessagesIndexPage() {
  const { push } = useToast();
  const { user, token } = useAuthStore();
  const { socket, connect } = useSocketStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastReadByPeer, setLastReadByPeer] = useState<Record<string, string>>({});

  const getLastReadMap = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem("z4rum_last_read_dm");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const list = await (messageApi as any).conversations();
      setConversations(list);
    } catch (e: any) {
      push(e?.response?.data?.error || "Tải hộp thoại thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setLastReadByPeer(getLastReadMap());
  }, []);

  useEffect(() => {
    if (!token) return;
    if (!socket) connect(token);
    const s = socket;
    if (!s) return;
    const handler = (m: { id: string; content: string; createdAt: string; senderId: string; receiverId?: string }) => {
      const other = m.senderId === user?.id ? m.receiverId : m.senderId;
      if (!other) return;
      setConversations((prev) => {
        const rest = prev.filter((c) => c.peer.id !== other);
        const existing = prev.find((c) => c.peer.id === other);
        const updated: Conversation = {
          peer: existing?.peer || { id: other, username: other, avatarUrl: undefined },
          lastMessage: m,
        };
        return [updated, ...rest];
      });
    };
    s.on("dm:receive", handler);
    return () => {
      s.off("dm:receive", handler);
    };
  }, [socket, token, connect, user]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <RequireAuth />
      <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-5">
        <h1 className="text-white text-lg font-semibold mb-4">Hội thoại</h1>
        {loading && <div className="text-[#94a3b8]">Đang tải...</div>}
        <div className="flex flex-col">
          {conversations.map((c) => {
            const lastReadIso = lastReadByPeer[c.peer.id];
            const isUnread = c.lastMessage.senderId !== user?.id && (!lastReadIso || new Date(c.lastMessage.createdAt) > new Date(lastReadIso));
            return (
            <Link key={c.peer.id} href={`/messages/${c.peer.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#0f2236] border-b border-[#0e1c2e] last:border-b-0">
              <img src={c.peer.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4"} className="w-10 h-10 rounded-full ring-2 ring-[#1e3a52]" alt="avatar" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className={`truncate ${isUnread ? "text-white font-semibold" : "text-[#cbd5e1]"}`}>{c.peer.username}</div>
                  <div className="text-[#64748b] text-xs shrink-0">{formatTime(c.lastMessage.createdAt)}</div>
                </div>
                <div className={`text-sm truncate ${isUnread ? "text-white font-semibold" : "text-[#94a3b8]"}`}>{c.lastMessage.content}</div>
              </div>
            </Link>
            );
          })}
          {!loading && conversations.length === 0 && (
            <div className="text-[#94a3b8]">Chưa có hội thoại. Hãy vào profile và nhấn Nhắn tin để bắt đầu.</div>
          )}
        </div>
      </div>
    </div>
  );
}




