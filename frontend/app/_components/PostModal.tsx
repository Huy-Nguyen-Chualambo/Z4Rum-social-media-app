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

    if (file.size > 5 * 1024 * 1024) {
      push("Ảnh quá lớn (chỉ hỗ trợ < 5MB)", "error");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
    formData.append("cloud_name", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "");

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url) {
        setImageUrl(data.secure_url);
        push("Ảnh đã sẵn sàng!", "success");
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error(error);
      push("Lỗi khi tải ảnh lên Cloudinary", "error");
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
    <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div onClick={(e) => e.stopPropagation()} className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-[2.5rem] w-full max-w-xl p-8 relative z-[101] shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            <h2 className="text-white text-xl font-bold tracking-tight">Tạo bài viết mới</h2>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-white transition-colors bg-[#1e293b]/50 p-2.5 rounded-xl border border-[#334155]">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-start gap-4 mb-6">
          <img
            src={user?.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4"}
            className="w-11 h-11 rounded-xl ring-2 ring-[#1e3a52] object-cover shrink-0"
            alt="avatar"
          />
          <div className="flex-1 min-w-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Bảnh ơi, bạn đang nghĩ gì thế?`}
              className="bg-transparent w-full outline-none text-[#cbd5e1] placeholder:text-[#475569] mb-3 resize-none min-h-[120px] text-[17px] font-medium leading-relaxed"
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
              <div className="mb-6 relative group border border-[#1e3a52] rounded-2xl overflow-hidden shadow-xl bg-[#0a1628]">
                {isUploading ? (
                  <div className="w-full h-48 bg-[#1e293b] flex flex-col items-center justify-center animate-pulse">
                    <div className="w-8 h-8 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-[#64748b] text-xs font-bold uppercase tracking-widest">Đang tải ảnh...</span>
                  </div>
                ) : (
                  <>
                    <img src={imageUrl} alt="preview" className="w-full max-h-[350px] object-contain bg-black/20" />
                    <button
                      onClick={() => setImageUrl("")}
                      className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-xl text-white hover:bg-black/80 transition-all border border-white/10"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Emoji Picker */}
            {isEmojiPickerOpen && (
              <div className="mb-6 bg-[#0f1e30] border border-blue-500/20 p-4 rounded-2xl grid grid-cols-6 sm:grid-cols-8 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="text-2xl hover:bg-blue-500/10 p-2 rounded-xl transition-all hover:scale-125 active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#1e3a52] pt-5 gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  className={`group flex items-center gap-2 p-2.5 rounded-xl transition-all font-bold text-sm ${isUploading ? 'text-[#475569] cursor-not-allowed' : 'text-[#60A5FA] bg-blue-500/5 hover:bg-blue-500/10'}`}
                  type="button"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={isUploading}
                >
                  <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline text-xs">Ảnh</span>
                </button>
                <button
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  className={`group flex items-center gap-2 p-2.5 rounded-xl transition-all font-bold text-sm ${isEmojiPickerOpen ? 'bg-blue-500 text-white shadow-lg' : 'text-[#60A5FA] bg-blue-500/5 hover:bg-blue-500/10'}`}
                  type="button"
                >
                  <Smile size={20} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !content.trim() || isUploading}
                className="px-6 py-2.5 bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
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
