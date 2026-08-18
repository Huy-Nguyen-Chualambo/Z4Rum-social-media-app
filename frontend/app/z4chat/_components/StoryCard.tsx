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
    <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-3xl p-4 flex flex-col hover:border-[#8B5CF6]/40 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2.5 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 shrink-0">
          <BookOpen size={18} className="text-[#a78bfa]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-bold truncate">{story.title}</h3>
          {story.synopsis && (
            <p className="text-[#94a3b8] text-[13px] leading-snug line-clamp-2 mt-0.5">{story.synopsis}</p>
          )}
          {!isOwner && story.owner && <p className="text-[#475569] text-xs mt-1">của {story.owner.username}</p>}
        </div>
      </div>

      {story.userRoleName && (
        <p className="flex items-center gap-1.5 text-[#64748b] text-xs mb-3">
          <UserSquare size={12} className="shrink-0" />
          Bạn vào vai: <span className="text-[#94a3b8]">{story.userRoleName}</span>
        </p>
      )}

      {story.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {story.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="bg-[#1e293b] border border-[#334155] text-[#94a3b8] text-[11px] font-semibold px-2 py-0.5 rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1">
        <p className="flex-1 text-[#475569] text-xs">
          {story.openingScene ? "Có màn mở đầu" : "Chưa có màn mở đầu"}
        </p>
        {isOwner && (
          <>
            <button
              onClick={onEdit}
              className="p-2.5 rounded-xl border border-[#1e3a52] text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-colors"
              aria-label="Sửa cốt truyện"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="p-2.5 rounded-xl border border-[#1e3a52] text-[#94a3b8] hover:text-[#f87171] hover:bg-[#1e293b] transition-colors"
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
