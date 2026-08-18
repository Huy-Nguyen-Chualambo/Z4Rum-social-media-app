"use client";
import { useEffect, useState } from "react";
import { BellRing, Check, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import type { Z4Message } from "@/lib/z4chat/types";

const FALLBACK_AVATAR = "https://avatars.githubusercontent.com/u/0?v=4";

/**
 * Renders *action* markup as italics and leaves speech alone - the convention the
 * system prompt asks the model to follow.
 */
function renderContent(content: string): React.ReactNode {
  return content.split(/(\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={index} className="text-[#94a3b8] not-italic opacity-90 italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

const formatTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

export default function ChatBubble({
  message,
  characterName,
  avatarUrl,
  streaming,
  canRegenerate,
  repeatWarning,
  onRegenerate,
  onEdit,
  onDelete,
}: {
  message: Z4Message;
  characterName: string;
  avatarUrl?: string | null;
  streaming?: boolean;
  canRegenerate?: boolean;
  /** Set when this reply looked too much like recent ones. */
  repeatWarning?: boolean;
  onRegenerate?: () => void;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
}) {
  const isUser = message.role === "user";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  useEffect(() => setDraft(message.content), [message.content]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== message.content) onEdit?.(next);
    setEditing(false);
  };

  return (
    <div className={`flex gap-3 group ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <img
          src={avatarUrl || FALLBACK_AVATAR}
          alt={characterName}
          className="w-9 h-9 rounded-xl object-cover ring-1 ring-[#1e3a52] shrink-0 mt-1"
        />
      )}

      <div className={`max-w-[85%] sm:max-w-[75%] min-w-0 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {message.kind === "proactive" && (
          <span className="flex items-center gap-1.5 text-[#a78bfa] text-[11px] font-bold mb-1 ml-1">
            <BellRing size={11} />
            {characterName} nhắn trước
          </span>
        )}

        {editing ? (
          <div className="w-full">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={Math.min(10, Math.max(2, draft.split("\n").length + 1))}
              autoFocus
              className="w-full bg-[#0a1628] border border-[#3B82F6]/50 rounded-2xl px-4 py-3 text-[#e2e8f0] outline-none resize-y leading-relaxed text-[15px]"
            />
            <div className="flex items-center gap-2 mt-2 justify-end">
              <button
                onClick={() => {
                  setDraft(message.content);
                  setEditing(false);
                }}
                className="p-2 rounded-lg border border-[#1e3a52] text-[#94a3b8] hover:text-white"
                aria-label="Huỷ sửa"
              >
                <X size={14} />
              </button>
              <button
                onClick={commit}
                className="p-2 rounded-lg bg-[#3B82F6] text-white hover:bg-[#2563eb]"
                aria-label="Lưu sửa"
              >
                <Check size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
              isUser
                ? "bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white rounded-br-md"
                : message.kind === "opening"
                ? "bg-[#0f1e30] border border-[#8B5CF6]/25 text-[#cbd5e1] rounded-bl-md"
                : "bg-[#0f1e30] border border-[#1e3a52] text-[#e2e8f0] rounded-bl-md"
            }`}
          >
            {renderContent(message.content)}
            {streaming && <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-[#60A5FA] animate-pulse" />}
          </div>
        )}

        {/* Repetition nudge: flagged, not auto-fixed - rewriting the character's
            line behind the user's back is worse than telling them about it. */}
        {repeatWarning && !streaming && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 mt-1.5 ml-1 text-[#fbbf24] hover:text-[#fcd34d] text-[11px] font-semibold"
          >
            <RefreshCw size={11} />
            Câu này khá giống mấy lượt trước — viết lại khác?
          </button>
        )}

        {!editing && !streaming && (
          <div
            className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${
              isUser ? "flex-row-reverse" : ""
            }`}
          >
            <span className="text-[#475569] text-[11px] px-1">{formatTime(message.createdAt)}</span>
            {canRegenerate && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded-lg text-[#64748b] hover:text-[#60A5FA] hover:bg-[#1e293b]"
                aria-label="Tạo lại câu trả lời"
              >
                <RefreshCw size={13} />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-[#64748b] hover:text-[#60A5FA] hover:bg-[#1e293b]"
                aria-label="Sửa tin nhắn"
              >
                <Pencil size={13} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-[#64748b] hover:text-[#f87171] hover:bg-[#1e293b]"
                aria-label="Xoá tin nhắn"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
