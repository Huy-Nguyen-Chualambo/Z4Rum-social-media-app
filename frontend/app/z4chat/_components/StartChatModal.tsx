"use client";
import { useState } from "react";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import type { Z4Character, Z4Story } from "@/lib/z4chat/types";
import Modal from "./Modal";
import { GhostButton, PrimaryButton } from "./FormBits";

const FALLBACK_AVATAR = "https://avatars.githubusercontent.com/u/0?v=4";

/**
 * Pair a character with a story. Characters and stories are stored separately so
 * the same character can be dropped into any plot - this is where the two meet.
 */
export default function StartChatModal({
  open,
  character,
  stories,
  starting,
  onClose,
  onStart,
}: {
  open: boolean;
  character: Z4Character | null;
  stories: Z4Story[];
  starting: boolean;
  onClose: () => void;
  onStart: (storyId: string | null) => void;
}) {
  const [storyId, setStoryId] = useState<string | null>(null);

  if (!character) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bắt đầu cuộc trò chuyện"
      maxWidth="max-w-xl"
      footer={
        <>
          <GhostButton onClick={onClose} disabled={starting}>
            Huỷ
          </GhostButton>
          <PrimaryButton onClick={() => onStart(storyId)} disabled={starting}>
            {starting ? <Loader2 size={16} className="animate-spin" /> : "Vào chat"}
          </PrimaryButton>
        </>
      }
    >
      <div className="flex items-center gap-4 mb-6 bg-[#0a1628] border border-[#1e3a52] rounded-2xl p-4">
        <img
          src={character.avatarUrl || FALLBACK_AVATAR}
          alt={character.name}
          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#1e3a52] shrink-0"
        />
        <div className="min-w-0">
          <h3 className="text-white font-bold truncate">{character.name}</h3>
          <p className="text-[#94a3b8] text-[13px] line-clamp-2">
            {character.tagline || character.description}
          </p>
        </div>
      </div>

      <p className="text-[#cbd5e1] text-sm font-semibold mb-3">Chọn cốt truyện</p>

      <div className="space-y-2">
        <button
          onClick={() => setStoryId(null)}
          className={`w-full text-left p-4 rounded-2xl border transition-all ${
            storyId === null
              ? "border-[#3B82F6]/50 bg-gradient-to-r from-[#3B82F6]/15 to-[#8B5CF6]/15"
              : "border-[#1e3a52] hover:bg-[#1e293b]/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-[#60A5FA] shrink-0" />
            <span className="text-white font-semibold text-sm">Không cần cốt truyện</span>
          </div>
          <p className="text-[#64748b] text-xs mt-1 ml-[26px]">Trò chuyện tự do, câu chuyện tự nảy ra khi chat.</p>
        </button>

        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => setStoryId(story.id)}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              storyId === story.id
                ? "border-[#8B5CF6]/50 bg-gradient-to-r from-[#3B82F6]/15 to-[#8B5CF6]/15"
                : "border-[#1e3a52] hover:bg-[#1e293b]/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen size={16} className="text-[#a78bfa] shrink-0" />
              <span className="text-white font-semibold text-sm truncate">{story.title}</span>
            </div>
            {story.synopsis && (
              <p className="text-[#64748b] text-xs mt-1 ml-[26px] line-clamp-2">{story.synopsis}</p>
            )}
            {story.userRoleName && (
              <p className="text-[#475569] text-xs mt-1 ml-[26px]">Bạn vào vai: {story.userRoleName}</p>
            )}
          </button>
        ))}

        {stories.length === 0 && (
          <p className="text-[#64748b] text-xs text-center py-3">
            Bạn chưa có cốt truyện nào. Tạo một cái ở tab &ldquo;Cốt truyện&rdquo; để nhân vật có bối cảnh rõ ràng hơn.
          </p>
        )}
      </div>
    </Modal>
  );
}
