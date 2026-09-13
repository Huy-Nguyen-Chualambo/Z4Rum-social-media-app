"use client";
import { BookOpen, Pencil, Trash2, UserSquare } from "lucide-react";
import type { Z4Story } from "@/lib/z4chat/types";

export default function StoryCard({
  story,
  isOwner,
  onEdit,
  onDelete,
}: {
  story: Z4Story;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-[#141414] border border-[#303030] rounded-sm p-4 flex flex-col hover:border-[#3B82F6]/40 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2.5 rounded-sm bg-[#3B82F6]/10 border border-[#3B82F6]/25 shrink-0">
          <BookOpen size={18} className="text-[#3B82F6]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-bold truncate">{story.title}</h3>
          {story.synopsis && (
            <p className="text-[#a3a3a3] text-[13px] leading-snug line-clamp-2 mt-0.5">{story.synopsis}</p>
          )}
          {!isOwner && story.owner && <p className="text-[#858585] text-xs mt-1">của {story.owner.username}</p>}
        </div>
      </div>

      {story.userRoleName && (
        <p className="flex items-center gap-1.5 text-[#969696] text-xs mb-3">
          <UserSquare size={12} className="shrink-0" />
          Bạn vào vai: <span className="text-[#a3a3a3]">{story.userRoleName}</span>
        </p>
      )}

      {story.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {story.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="bg-[#292929] border border-[#383838] text-[#a3a3a3] text-[11px] font-semibold px-2 py-0.5 rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1">
        <p className="flex-1 text-[#858585] text-xs">
          {story.openingScene ? "Có màn mở đầu" : "Chưa có màn mở đầu"}
        </p>
        {isOwner && (
          <>
            <button
              onClick={onEdit}
              className="p-2.5 rounded-sm border border-[#303030] text-[#a3a3a3] hover:text-white hover:bg-[#292929] transition-colors"
              aria-label="Sửa cốt truyện"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="p-2.5 rounded-sm border border-[#303030] text-[#a3a3a3] hover:text-[#f87171] hover:bg-[#292929] transition-colors"
              aria-label="Xoá cốt truyện"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
