"use client";
import { BellRing, MessageSquare, Pencil, Trash2 } from "lucide-react";
import type { Z4Character } from "@/lib/z4chat/types";

const FALLBACK_AVATAR = "https://avatars.githubusercontent.com/u/0?v=4";

export default function CharacterCard({
  character,
  isOwner,
  onChat,
  onEdit,
  onDelete,
}: {
  character: Z4Character;
  isOwner: boolean;
  onChat: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-[#141414] border border-[#303030] rounded-sm p-4 flex flex-col hover:border-[#3B82F6]/40 transition-colors">
      <div className="flex items-start gap-3.5 mb-3">
        <img
          src={character.avatarUrl || FALLBACK_AVATAR}
          alt={character.name}
          className="w-14 h-14 rounded-sm object-cover   shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-white font-bold truncate">{character.name}</h3>
            {character.proactive && (
              <span title="Sẽ nhắn tin trước" className="shrink-0 leading-none">
                <BellRing size={13} className="text-[#3B82F6]" />
              </span>
            )}
          </div>
          <p className="text-[#a3a3a3] text-[13px] leading-snug line-clamp-2 mt-0.5">
            {character.tagline || character.description}
          </p>
          {!isOwner && character.owner && (
            <p className="text-[#858585] text-xs mt-1">của {character.owner.username}</p>
          )}
        </div>
      </div>

      {character.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {character.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="bg-[#292929] border border-[#383838] text-[#a3a3a3] text-[11px] font-semibold px-2 py-0.5 rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={onChat}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm bg-blue-500 text-white text-sm font-bold  transition-all active:scale-95"
        >
          <MessageSquare size={15} />
          Bắt đầu chat
        </button>
        {isOwner && (
          <>
            <button
              onClick={onEdit}
              className="p-2.5 rounded-sm border border-[#303030] text-[#a3a3a3] hover:text-white hover:bg-[#292929] transition-colors"
              aria-label="Sửa nhân vật"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="p-2.5 rounded-sm border border-[#303030] text-[#a3a3a3] hover:text-[#f87171] hover:bg-[#292929] transition-colors"
              aria-label="Xoá nhân vật"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
