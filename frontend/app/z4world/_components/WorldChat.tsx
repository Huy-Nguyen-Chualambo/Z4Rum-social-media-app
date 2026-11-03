"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { WorldMessage } from "@/lib/world/types";
import styles from "./world-hud.module.css";

export default function WorldChat({
  open,
  composing,
  messages,
  seated,
  scope,
  alone,
  canSend,
  onScope,
  onSend,
  onClose,
  onComposing,
}: {
  open: boolean;
  composing: boolean;
  messages: WorldMessage[];
  seated: boolean;
  scope: string;
  alone: boolean;
  canSend: boolean;
  onScope: (scope: string) => void;
  onSend: (text: string) => boolean;
  onClose: () => void;
  onComposing: (value: boolean) => void;
}) {
  const [text, setText] = useState("");
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, open]);

  const history = (
    <div
      ref={log}
      role="log"
      aria-live="polite"
      className={
        open
          ? "mb-2 flex min-h-0 flex-1 flex-col overflow-y-auto text-[13px] leading-snug"
          : "sr-only"
      }
    >
      {messages.length ? (
        messages.map((m) => (
          <p key={m.id} className="break-words py-0.5">
            <span className="font-semibold text-blue-400">
              {m.scope === "table" ? "[Bàn] " : ""}
              {m.username}:{" "}
            </span>
            {m.text}
          </p>
        ))
      ) : (
        <p className="text-[#858585]">
          {alone
            ? "Sảnh đang vắng. Bấm “Mời bạn” để rủ bạn bè vào cùng."
            : "Lại gần một người và nói lời chào!"}
        </p>
      )}
    </div>
  );
  // Stay mounted while closed so screen readers still hear new messages.
  if (!open) return history;

  return (
    <section
      aria-label="Trò chuyện"
      className={`${styles.panel} ${styles.chat} flex min-h-0 flex-col p-2.5`}
    >
      {!composing && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold">
            Trò chuyện{" "}
            {scope === "table" && seated ? "riêng tại bàn" : "gần bạn"}
          </h2>
          <div className="flex items-center gap-1">
            {seated && (
              <select
                aria-label="Kênh trò chuyện"
                value={scope}
                onChange={(e) => onScope(e.target.value)}
                className="rounded-sm border border-[#303030] bg-[#1c1c1c] p-1 text-xs"
              >
                <option value="nearby">Gần bạn</option>
                <option value="table">Riêng tại bàn</option>
              </select>
            )}
            <button
              aria-label="Đóng trò chuyện"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-[#292929]"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      {history}
      <form
        className="flex shrink-0 gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (onSend(text)) setText("");
        }}
      >
        <input
          aria-label="Tin nhắn gần bạn"
          maxLength={200}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => onComposing(true)}
          onBlur={() => onComposing(false)}
          placeholder="Nói gì đó với anh em…"
          className="h-10 min-w-0 flex-1 rounded-sm border border-[#303030] bg-[#101010] focus:border-blue-500 px-3 text-base placeholder:text-[#858585] md:text-sm"
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
