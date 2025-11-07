"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { messageApi } from "@/lib/api/messageApi";
import { useToast } from "@/lib/ui/toast";
import RequireAuth from "@/app/_components/RequireAuth";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useSocketStore } from "@/lib/store/useSocketStore";

const formatTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

type DM = { id: string; content: string; senderId: string; receiverId?: string | null; createdAt: string };

export default function ChatPage() {
  const params = useParams<{ userId: string }>();
  const otherId = params?.userId as string;
  const { push } = useToast();
  const { token, user } = useAuthStore();
  const { socket, connect } = useSocketStore();

  const [messages, setMessages] = useState<DM[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pageActiveRef = useRef(true);

  const getLastReadMap = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem("z4rum_last_read_dm");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const setLastRead = (peerId: string, iso: string) => {
    try {
      const map = getLastReadMap();
      map[peerId] = iso;
      localStorage.setItem("z4rum_last_read_dm", JSON.stringify(map));
    } catch {}
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await messageApi.history(otherId);
      setMessages(data);
    } catch (e: any) {
      push(e?.response?.data?.error || "Tải tin nhắn thất bại", "error");
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId]);

  useEffect(() => {
    if (!token) return;
    if (!socket) connect(token);
    // subscribe
    const s = socket;
    if (!s) return;
    const handler = (m: DM) => {
      // only append if this DM is with the opened user
      if ((m.senderId === otherId && m.receiverId === user?.id) || (m.senderId === user?.id && m.receiverId === otherId)) {
        setMessages((prev) => [...prev, m]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
        // mark as read if message is in this open thread and from other
        if (pageActiveRef.current && m.senderId === otherId) setLastRead(otherId, m.createdAt);
      }
    };
    s.on("dm:receive", handler);
    return () => {
      s.off("dm:receive", handler);
    };
  }, [socket, token, connect, otherId, user]);

  // Mark read when opening this thread
  useEffect(() => {
    pageActiveRef.current = true;
    const latest = messages[messages.length - 1]?.createdAt;
    if (latest) setLastRead(otherId, latest);
    return () => {
      pageActiveRef.current = false;
      const latest2 = messages[messages.length - 1]?.createdAt;
      if (latest2) setLastRead(otherId, latest2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId, messages.length]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    try {
      // prefer socket for realtime fanout
      const s = socket;
      if (s) {
        s.emit("dm:send", { to: otherId, content: text });
      } else {
        const m = await messageApi.send(otherId, { content: text });
        setMessages((prev) => [...prev, m]);
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    } catch (e: any) {
      push(e?.response?.data?.error || "Gửi tin nhắn thất bại", "error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <RequireAuth />
      <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl h-[70vh] flex flex-col">
        <div className="px-5 py-3 border-b border-[#1e293b] text-white font-semibold flex items-center gap-3">
          <Link href="/messages" className="text-[#94a3b8] hover:text-white">←</Link>
          <span>Tin nhắn với {otherId}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {messages.map((m) => {
            const isMine = m.senderId === user?.id;
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div className={`${isMine ? "bg-[#1b3a5a]" : "bg-[#102032]"} text-[#cbd5e1] inline-block px-3 py-2 rounded-lg max-w-[80%]`}>{m.content}</div>
                <div className="text-[#64748b] text-xs mt-1">{isMine ? "Bạn" : otherId} · {formatTime(m.createdAt)}</div>
              </div>
            );
          })}
          {loading && <div className="text-[#94a3b8]">Đang tải...</div>}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t border-[#1e293b] flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Nhập tin nhắn"
            className="flex-1 bg-transparent outline-none text-[#cbd5e1] placeholder:text-[#475569] border-b border-[#1e3a52] py-2"
          />
          <button onClick={send} className="px-4 py-2 bg-[#12304a] text-white rounded-lg hover:bg-[#163b59]">Gửi</button>
        </div>
      </div>
    </div>
  );
}


