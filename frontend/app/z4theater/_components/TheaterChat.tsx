"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { RoomMessage } from "@/lib/theater/types";

export default function TheaterChat({
  messages,
  self,
  alone,
  canSend,
  onSend,
  onClose,
}: {
  messages: RoomMessage[];
  self: string;
  alone: boolean;
  canSend: boolean;
  onSend: (text: string) => boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages]);
  return (
    <section
      aria-label="Trò chuyện"
      className="flex min-h-0 min-w-0 flex-col border-t border-[#292929] bg-[#141414] p-2.5 lg:border-l lg:border-t-0 [@media(max-height:500px)]:border-l [@media(max-height:500px)]:border-t-0"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold">Trò chuyện trong phòng</h2>
        <button
          aria-label="Đóng trò chuyện"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-[#292929]"
        >
          <X size={16} />
        </button>
      </div>
      <div
        ref={log}
        role="log"
        aria-live="polite"
        className="mb-2 flex min-h-0 flex-1 flex-col overflow-y-auto text-[13px] leading-snug"
      >
        {messages.length ? (
          messages.map((m) => (
            <p key={m.id} className="break-words py-0.5">
              <span
                className={`font-semibold ${m.from === self ? "text-blue-400" : "text-[#dedede]"}`}
              >
                {m.username}:{" "}
              </span>
              {m.text}
            </p>
          ))
        ) : (
          <p className="text-[#858585]">
            {alone
              ? "Phòng chỉ có mình bạn. Bấm “Mời bạn” để gửi link cho bạn bè."
              : "Nói gì đó với cả phòng!"}
          </p>
        )}
      </div>
      <form
        className="flex shrink-0 gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (onSend(text)) setText("");
        }}
      >
        <input
          aria-label="Tin nhắn trong phòng"
          maxLength={200}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Nhắn cho cả phòng…"
          className="h-10 min-w-0 flex-1 rounded-sm border border-[#303030] bg-[#101010] px-3 text-base placeholder:text-[#858585] focus:border-blue-500 md:text-sm"
        />
        <button
          disabled={!canSend || !text.trim()}
          className="h-10 rounded-sm bg-blue-500 px-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          Gửi
        </button>
      </form>
    </section>
  );
}
