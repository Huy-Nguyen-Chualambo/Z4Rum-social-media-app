"use client";
import { useEffect, useRef } from "react";
import { Loader2, Send, Square } from "lucide-react";
import { useZ4chatStore } from "@/lib/store/useZ4chatStore";

/**
 * The input row. The draft lives in the Z4chat store (and localStorage), not in
 * local state, so a failed reply, a reload, or wandering off to another page
 * never eats what you typed - one of the "lỗi char nhiều mà ko fix" papercuts.
 */
export default function ChatComposer({
  sessionId,
  characterName,
  streaming,
  disabled,
  onSend,
  onStop,
}: {
  sessionId: string;
  characterName: string;
  streaming: boolean;
  disabled?: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const draft = useZ4chatStore((state) => state.drafts[sessionId] || "");
  const hydrated = useZ4chatStore((state) => state.hydrated);
  const hydrateDrafts = useZ4chatStore((state) => state.hydrateDrafts);
  const setDraft = useZ4chatStore((state) => state.setDraft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => hydrateDrafts(), [hydrateDrafts]);

  // Grow with the text instead of scrolling a two-line box.
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(160, node.scrollHeight)}px`;
  }, [draft]);

  const submit = () => {
    const text = draft.trim();
    if (!text || streaming || disabled) return;
    onSend(text);
  };

  return (
    <div className="chat-input-row shrink-0 border-t border-[#303030] bg-[#141414]/80  px-3 sm:px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={hydrated ? draft : ""}
          onChange={(event) => setDraft(sessionId, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={4000}
          disabled={disabled}
          placeholder={`Nói gì với ${characterName}…`}
          className="min-w-0 flex-1 bg-[#141414] border border-[#303030] rounded-sm px-4 py-3 text-[#ededed] placeholder:text-[#858585] outline-none focus:border-[#3B82F6]/60 resize-none leading-relaxed text-[15px] transition-colors disabled:opacity-50"
        />

        {streaming ? (
          <button
            onClick={onStop}
            className="shrink-0 w-12 h-12 rounded-sm border border-[#303030] text-[#a3a3a3] hover:text-white hover:bg-[#292929] flex items-center justify-center transition-colors"
            aria-label="Dừng"
            title="Dừng trả lời"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!draft.trim() || disabled}
            className="shrink-0 w-12 h-12 rounded-sm bg-blue-500 text-white flex items-center justify-center  transition-all active:scale-95 disabled:opacity-35 "
            aria-label="Gửi"
          >
            {disabled ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        )}
      </div>

      <p className="text-[#858585] text-[11px] mt-1.5 ml-1 hidden sm:block">
        Enter để gửi · Shift+Enter để xuống dòng · viết hành động trong *dấu sao*
      </p>
    </div>
  );
}
