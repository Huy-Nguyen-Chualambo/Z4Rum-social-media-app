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
      <div className="flex items-center gap-4 mb-6 bg-[#141414] border border-[#303030] rounded-sm p-4">
        <img
          src={character.avatarUrl || FALLBACK_AVATAR}
          alt={character.name}
          className="w-14 h-14 rounded-sm object-cover   shrink-0"
        />
        <div className="min-w-0">
          <h3 className="text-white font-bold truncate">{character.name}</h3>
          <p className="text-[#a3a3a3] text-[13px] line-clamp-2">
            {character.tagline || character.description}
          </p>
        </div>
      </div>

      <p className="text-[#dedede] text-sm font-semibold mb-3">Chọn cốt truyện</p>

      <div className="space-y-2">
        <button
          onClick={() => setStoryId(null)}
          className={`w-full text-left p-4 rounded-sm border transition-all ${
            storyId === null
              ? "border-[#3B82F6]/50 bg-blue-500"
              : "border-[#303030] hover:bg-[#292929]/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-[#3B82F6] shrink-0" />
            <span className="text-white font-semibold text-sm">Không cần cốt truyện</span>
          </div>
          <p className="text-[#969696] text-xs mt-1 ml-[26px]">Trò chuyện tự do, câu chuyện tự nảy ra khi chat.</p>
        </button>

        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => setStoryId(story.id)}
            className={`w-full text-left p-4 rounded-sm border transition-all ${
              storyId === story.id
                ? "border-[#3B82F6]/50 bg-blue-500"
                : "border-[#303030] hover:bg-[#292929]/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen size={16} className="text-[#3B82F6] shrink-0" />
              <span className="text-white font-semibold text-sm truncate">{story.title}</span>
            </div>
            {story.synopsis && (
              <p className="text-[#969696] text-xs mt-1 ml-[26px] line-clamp-2">{story.synopsis}</p>
            )}
            {story.userRoleName && (
              <p className="text-[#858585] text-xs mt-1 ml-[26px]">Bạn vào vai: {story.userRoleName}</p>
            )}
          </button>
        ))}

        {stories.length === 0 && (
          <p className="text-[#969696] text-xs text-center py-3">
            Bạn chưa có cốt truyện nào. Tạo một cái ở tab &ldquo;Cốt truyện&rdquo; để nhân vật có bối cảnh rõ ràng hơn.
          </p>
        )}
      </div>
    </Modal>
  );
}
