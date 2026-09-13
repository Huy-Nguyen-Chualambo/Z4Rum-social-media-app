"use client";
import React, { useState } from "react";
import { postApi } from "@/lib/api/postApi";
import { useToast } from "@/lib/ui/toast";
import { Image as ImageIcon, Smile, X } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { uploadImage } from "@/lib/utils/cloudinary";

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

export default function PostModal({ isOpen, onClose, onPostCreated }: PostModalProps) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const { push } = useToast();
  const { user } = useAuthStore();

  const commonEmojis = ["😂", "😍", "🔥", "💀", "😢", "❤️", "✨", "🙌", "👍", "🤔", "🤣", "😭", "🚀", "🍿", "🎮", "🎸"];

  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      setImageUrl(await uploadImage(file));
      push("Ảnh đã sẵn sàng!", "success");
    } catch (error: any) {
      console.error(error);
      push(error?.message || "Lỗi khi tải ảnh lên Cloudinary", "error");
    } finally {
      setIsUploading(false);
    }
  };

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

  if (!isOpen) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/60  z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div onClick={(e) => e.stopPropagation()} className="bg-[#141414] border border-[#303030] rounded-sm w-full max-w-xl p-4 sm:p-8 max-h-[calc(100dvh-2rem)] overflow-y-auto relative z-[101]  animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            <h2 className="text-white text-xl font-bold tracking-tight">Tạo bài viết mới</h2>
          </div>
          <button aria-label="Đóng cửa sổ đăng bài" onClick={onClose} className="min-h-11 min-w-11 text-[#969696] hover:text-white transition-colors bg-[#292929]/50 p-2.5 rounded-sm border border-[#383838]">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-start gap-4 mb-6">
          <img
            src={user?.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4"}
            className="w-11 h-11 rounded-sm   object-cover shrink-0"
            alt="avatar"
          />
          <div className="flex-1 min-w-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Bảnh ơi, bạn đang nghĩ gì thế?`}
              className="bg-transparent w-full outline-none text-[#dedede] placeholder:text-[#858585] mb-3 resize-none min-h-[120px] text-[17px] font-medium leading-relaxed"
            />

            {/* Hidden File Input */}
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />

            {/* Image Preview */}
            {(imageUrl || isUploading) && (
              <div className="mb-6 relative group border border-[#303030] rounded-sm overflow-hidden  bg-[#141414]">
                {isUploading ? (
                  <div className="w-full h-48 bg-[#292929] flex flex-col items-center justify-center animate-pulse">
                    <div className="w-8 h-8 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-[#969696] text-xs font-bold uppercase tracking-widest">Đang tải ảnh...</span>
                  </div>
                ) : (
                  <>
                    <img src={imageUrl} alt="preview" className="w-full max-h-[350px] object-contain bg-black/20" />
                    <button
                      onClick={() => setImageUrl("")}
                      className="absolute top-3 right-3 p-2 bg-black/60  rounded-sm text-white hover:bg-black/80 transition-all border border-white/10"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Emoji Picker */}
            {isEmojiPickerOpen && (
              <div className="mb-6 bg-[#141414] border border-blue-500/20 p-4 rounded-sm grid grid-cols-6 sm:grid-cols-8 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="text-2xl hover:bg-blue-500/10 p-2 rounded-sm transition-all  active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#303030] pt-5 gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  className={`group flex items-center gap-2 p-2.5 rounded-sm transition-all font-bold text-sm ${isUploading ? 'text-[#858585] cursor-not-allowed' : 'text-[#3B82F6] bg-blue-500/5 hover:bg-blue-500/10'}`}
                  type="button"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={isUploading}
                >
                  <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline text-xs">Ảnh</span>
                </button>
                <button
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  className={`group flex items-center gap-2 p-2.5 rounded-sm transition-all font-bold text-sm ${isEmojiPickerOpen ? 'bg-blue-500 text-white' : 'text-[#3B82F6] bg-blue-500/5 hover:bg-blue-500/10'}`}
                  type="button"
                >
                  <Smile size={20} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !content.trim() || isUploading}
                className="px-6 py-2.5 bg-blue-500 text-white font-bold rounded-sm  transition-all  active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 "
              >
                {creating ? "Đang đăng..." : "Đăng bài"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
