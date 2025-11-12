"use client";
import React, { useState } from "react";
import { postApi } from "@/lib/api/postApi";
import { useToast } from "@/lib/ui/toast";
import { Image as ImageIcon, Smile, X } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

export default function PostModal({ isOpen, onClose, onPostCreated }: PostModalProps) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const { push } = useToast();
  const { user } = useAuthStore();

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!content.trim()) {
      push("Vui lòng nhập nội dung", "error");
      return;
    }

    setCreating(true);
    try {
      await postApi.create({
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
      });
      push("Đăng bài thành công", "success");
      setContent("");
      setImageUrl("");
      onPostCreated?.();
      onClose();
    } catch (e: any) {
      push(e?.response?.data?.error || "Đăng bài thất bại", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl w-full max-w-2xl p-6 relative z-[101]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-xl font-bold">Tạo bài viết mới</h2>
          <button onClick={onClose} className="text-[#64748b] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex items-start gap-4 mb-4">
          <img
            src={user?.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4"}
            className="w-12 h-12 rounded-full ring-2 ring-[#1e3a52] object-cover"
            alt="avatar"
          />
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening in Z4rum?"
              className="bg-transparent w-full outline-none text-[#cbd5e1] placeholder:text-[#475569] mb-3 resize-none min-h-[120px]"
            />
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Image URL (tuỳ chọn)"
              className="bg-transparent w-full outline-none text-[#cbd5e1] placeholder:text-[#475569] mb-4 border-b border-[#1e3a52]"
            />
            {imageUrl && (
              <div className="mb-4">
                <img src={imageUrl} alt="preview" className="max-w-full rounded-xl max-h-64 object-cover" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="text-[#60A5FA] hover:bg-[#1e293b] p-2 rounded-lg transition-colors" type="button">
                  <ImageIcon size={18} />
                </button>
                <button className="text-[#60A5FA] hover:bg-[#1e293b] p-2 rounded-lg transition-colors" type="button">
                  <Smile size={18} />
                </button>
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !content.trim()}
                className="px-5 py-2 bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? "Đang đăng..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

