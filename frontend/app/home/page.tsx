"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import RequireAuth from "../_components/RequireAuth";
import { MessageCircle, Heart, Send, MoreHorizontal, Image as ImageIcon, Smile, Bookmark, Trash2, Share2, Link as LinkIcon, Video, BarChart3, MapPin } from "lucide-react";
import { postApi } from "@/lib/api/postApi";
import { useToast } from "@/lib/ui/toast";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useSocketStore } from "@/lib/store/useSocketStore";

type FeedPost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  author: { id: string; username: string; avatarUrl?: string | null };
  _count?: { likes: number; comments: number };
};

type FeedComment = {
  id: string;
  content: string;
  createdAt: string;
};

function PostCard({
  post,
  currentUserId,
  onDeleted,
  commentCount = 0,
  onAddComment,
  onOpen,
  likesCount = 0,
}: {
  post: FeedPost;
  currentUserId?: string;
  onDeleted?: (id: string) => void;
  commentCount?: number;
  onAddComment?: (postId: string, content: string) => void;
  onOpen?: (post: FeedPost) => void;
  likesCount?: number;
}) {
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(0);
  const [commenting, setCommenting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    try {
      const likedSetRaw = localStorage.getItem("z4rum_liked_posts");
      const likedSet: string[] = likedSetRaw ? JSON.parse(likedSetRaw) : [];
      setLiked(likedSet.includes(post.id));
      const countsRaw = localStorage.getItem("z4rum_like_counts");
      const counts: Record<string, number> = countsRaw ? JSON.parse(countsRaw) : {};
      const initial = counts[post.id] ?? likesCount ?? 0;
      setLocalLikes(initial);
    } catch { }
  }, [post.id, likesCount]);

  const handleLike = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (liking) return;
    setLiking(true);
    const prevLiked = liked;
    const prevCount = localLikes;
    try {
      const likedSetRaw = localStorage.getItem("z4rum_liked_posts");
      const likedSet: string[] = likedSetRaw ? JSON.parse(likedSetRaw) : [];
      const countsRaw = localStorage.getItem("z4rum_like_counts");
      const counts: Record<string, number> = countsRaw ? JSON.parse(countsRaw) : {};

      if (liked) {
        const nextLikedSet = likedSet.filter((x) => x !== post.id);
        localStorage.setItem("z4rum_liked_posts", JSON.stringify(nextLikedSet));
        const nextCount = Math.max(0, (counts[post.id] ?? localLikes ?? 0) - 1);
        counts[post.id] = nextCount;
        localStorage.setItem("z4rum_like_counts", JSON.stringify(counts));
        setLiked(false);
        setLocalLikes(nextCount);
      } else {
        if (!likedSet.includes(post.id)) {
          likedSet.push(post.id);
          localStorage.setItem("z4rum_liked_posts", JSON.stringify(likedSet));
        }
        const nextCount = (counts[post.id] || localLikes || 0) + 1;
        counts[post.id] = nextCount;
        localStorage.setItem("z4rum_like_counts", JSON.stringify(counts));
        setLiked(true);
        setLocalLikes(nextCount);
      }
    } catch {
      if (liked) {
        setLiked(false);
        setLocalLikes(Math.max(0, localLikes - 1));
      } else {
        setLiked(true);
        setLocalLikes(localLikes + 1);
      }
    }

    postApi
      .like(post.id)
      .then((r) => {
        const likedFromServer = (r as any).liked;
        if (typeof likedFromServer === "boolean") setLiked(likedFromServer);
        setLocalLikes(r.likes);
        try {
          const countsRaw = localStorage.getItem("z4rum_like_counts");
          const counts: Record<string, number> = countsRaw ? JSON.parse(countsRaw) : {};
          counts[post.id] = r.likes;
          localStorage.setItem("z4rum_like_counts", JSON.stringify(counts));
        } catch { }
      })
      .catch(() => {
        setLiked(prevLiked);
        setLocalLikes(prevCount);
      })
      .finally(() => setLiking(false));
  };

  const isOwner = currentUserId && post.author.id === currentUserId;

  return (
    <article onClick={() => onOpen?.(post)} className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-4 sm:p-5 hover:border-[#2d5a7b] transition-all duration-300 cursor-pointer group/card">
      <header className="flex items-center gap-3 mb-4 relative">
        <Link href={`/users/${post.author.id}`}>
          <img src={post.author.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4"} alt="avatar" className="w-12 h-12 rounded-xl object-cover ring-2 ring-[#1e3a52]" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-col">
            <Link href={`/users/${post.author.id}`} className="text-white font-bold text-[15px] hover:underline">
              {post.author.username}
            </Link>
            <span className="text-[#64748b] text-xs">{formatDateTime(post.createdAt)}</span>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }} className="text-[#64748b] hover:text-white hover:bg-[#1e293b] p-2 rounded-xl transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </header>

      <p className="text-[#cbd5e1] text-[15px] leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

      {post.imageUrl && (
        <div className="mb-4 rounded-2xl overflow-hidden bg-black/20 border border-[#1e3a52]">
          <img src={post.imageUrl} alt="post media" className="w-full h-auto max-h-[500px] object-contain mx-auto" />
        </div>
      )}

      <footer className="flex items-center gap-6 pt-2">
        <button onClick={(e) => handleLike(e)} className={`flex items-center gap-2 group/btn transition-colors ${liked ? "text-pink-500" : "text-[#64748b] hover:text-pink-500"}`}>
          <div className={`p-2 rounded-xl transition-all ${liked ? "bg-pink-500/10" : "group-hover/btn:bg-pink-500/10"}`}>
            <Heart size={20} className={liked ? "fill-current scale-110" : "group-hover/btn:scale-110"} />
          </div>
          <span className="text-sm font-bold">{localLikes}</span>
        </button>
        <button className="flex items-center gap-2 text-[#64748b] hover:text-blue-400 group/btn transition-colors">
          <div className="p-2 rounded-xl group-hover/btn:bg-blue-500/10 transition-all">
            <MessageCircle size={20} className="group-hover/btn:scale-110" />
          </div>
          <span className="text-sm font-bold">{commentCount}</span>
        </button>
        <button className="flex items-center gap-2 text-[#64748b] hover:text-green-400 group/btn transition-colors">
          <div className="p-2 rounded-xl group-hover/btn:bg-green-500/10 transition-all">
            <Send size={20} className="group-hover/btn:scale-110" />
          </div>
        </button>
      </footer>
    </article>
  );
}

export default function HomePage() {
  const { push } = useToast();
  const { user } = useAuthStore();
  const { socket } = useSocketStore();

  const [items, setItems] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Create Post States
  const [newContent, setNewContent] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const [commentsByPost, setCommentsByPost] = useState<Record<string, FeedComment[]>>({});
  const [commentDeltaByPost, setCommentDeltaByPost] = useState<Record<string, number>>({});
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [commentsCursorByPost, setCommentsCursorByPost] = useState<Record<string, string | null>>({});
  const [commentsLoadingByPost, setCommentsLoadingByPost] = useState<Record<string, boolean>>({});
  const [modalCommentText, setModalCommentText] = useState("");
  const [liveLikesByPost, setLiveLikesByPost] = useState<Record<string, number>>({});

  const loadComments = async (postId: string, cursor?: string | null) => {
    if (commentsLoadingByPost[postId]) return;
    setCommentsLoadingByPost((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await postApi.comments.list(postId, { limit: 20, cursor: cursor || undefined });
      setCommentsByPost((prev) => {
        const list = prev[postId] || [];
        const map = new Map<string, FeedComment>();
        [...list, ...res.items].forEach((c: FeedComment) => map.set(c.id, c));
        return { ...prev, [postId]: Array.from(map.values()) };
      });
      setCommentsCursorByPost((prev) => ({ ...prev, [postId]: res.nextCursor }));
    } catch (e: any) {
      push(e?.response?.data?.error || "Tải bình luận thất bại", "error");
    } finally {
      setCommentsLoadingByPost((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const load = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await postApi.list({ limit: 10, cursor: cursor || undefined });
      setItems((prev) => {
        const dedupMap = new Map<string, FeedPost>();
        prev.forEach(p => dedupMap.set(p.id, p));
        res.items.forEach((p: FeedPost) => dedupMap.set(p.id, p));
        const sorted = Array.from(dedupMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return sorted;
      });
      setCursor(res.nextCursor);
    } catch (e: any) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("post:likeUpdated", ({ postId, likes }: any) => {
      setLiveLikesByPost((prev) => ({ ...prev, [postId]: likes }));
    });
    return () => { socket.off("post:likeUpdated"); };
  }, [socket]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) load();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor]);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    setCreating(true);
    try {
      const created = await postApi.create({ content: newContent.trim(), imageUrl: newImageUrl.trim() || undefined });
      setItems(prev => [created as any, ...prev]);
      setNewContent("");
      setNewImageUrl("");
      setIsEmojiPickerOpen(false);
      push("Đăng bài thành công", "success");
    } catch (e: any) {
      push(e?.response?.data?.error || "Đăng bài thất bại", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        setNewImageUrl(data.secure_url);
        push("Ảnh đã sẵn sàng!", "success");
      }
    } catch (error) {
      push("Lỗi tải ảnh lên", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <RequireAuth />

      {/* Create Post Section */}
      <div className="mb-8 bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
        <div className="flex items-start gap-4">
          <img src={user?.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4"} className="w-12 h-12 rounded-2xl ring-2 ring-blue-500/20 object-cover" alt="profile" />
          <div className="flex-1 min-w-0">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Bảnh đang nghĩ gì thế?"
              className="bg-transparent w-full outline-none text-[#cbd5e1] placeholder:text-[#475569] mb-4 min-h-[100px] text-lg font-medium resize-none"
            />

            {/* Image Preview */}
            {(newImageUrl || isUploading) && (
              <div className="mb-4 relative group w-fit border border-[#1e3a52] rounded-2xl overflow-hidden">
                {isUploading ? (
                  <div className="w-48 h-32 bg-[#1e293b] flex items-center justify-center animate-pulse">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    <img src={newImageUrl} alt="preview" className="max-h-64 rounded-xl object-contain" />
                    <button onClick={() => setNewImageUrl("")} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-xl text-white hover:bg-black/80 transition-all backdrop-blur-md">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Emoji Picker */}
            {isEmojiPickerOpen && (
              <div className="mb-6 bg-[#0f1e30]/50 backdrop-blur-lg border border-blue-500/20 p-4 rounded-[1.5rem] grid grid-cols-6 sm:grid-cols-8 gap-2 animate-in fade-in slide-in-from-top-4">
                {["😂", "😍", "🔥", "💀", "😢", "❤️", "✨", "🙌", "👍", "🤔", "🤣", "😭", "🚀", "🍿", "🎮", "🎸"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewContent(prev => prev + emoji)}
                    className="text-2xl hover:bg-blue-500/10 p-2 rounded-xl transition-all hover:scale-125 active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#1e3a52] pt-6">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => document.getElementById("home-file-upload")?.click()}
                  className="p-2.5 text-[#60A5FA] hover:bg-blue-500/10 rounded-xl transition-all group"
                  title="Thêm ảnh"
                >
                  <ImageIcon size={22} className="group-hover:scale-110" />
                </button>
                <button
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  className={`p-2.5 rounded-xl transition-all group ${isEmojiPickerOpen ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-[#60A5FA] hover:bg-blue-500/10'}`}
                  title="Cảm xúc"
                >
                  <Smile size={22} className="group-hover:scale-110" />
                </button>
                {/*<button className="p-2.5 text-[#60A5FA] hover:bg-blue-500/10 rounded-xl transition-all group" title="Thêm video">
                  <Video size={22} className="group-hover:scale-110" />
                </button>
                <button className="p-2.5 text-[#60A5FA] hover:bg-blue-500/10 rounded-xl transition-all group" title="Tạo bình chọn">
                  <BarChart3 size={22} className="group-hover:scale-110" />
                </button>
                <button className="p-2.5 text-[#60A5FA] hover:bg-blue-500/10 rounded-xl transition-all group" title="Vị trí">
                  <MapPin size={22} className="group-hover:scale-110" />
                </button>*/}
              </div>

              <input type="file" id="home-file-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />

              <button
                onClick={handleCreate}
                disabled={creating || !newContent.trim() || isUploading}
                className="px-8 py-3 bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-black rounded-xl hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all hover:scale-105 active:scale-95 disabled:opacity-40 uppercase tracking-wider"
              >
                {creating ? "Đang đăng..." : "Đăng bài"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-6">
        {items.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            currentUserId={user?.id}
            onDeleted={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
            onAddComment={(postId, content) => loadComments(postId, null)}
            onOpen={(post) => setSelectedPost(post)}
            likesCount={(liveLikesByPost[p.id] ?? (p._count?.likes ?? 0))}
            commentCount={(p._count?.comments || 0) + (commentDeltaByPost[p.id] || 0)}
          />
        ))}
      </div>

      <div ref={sentinelRef} className="h-20" />
      {loading && <div className="text-center text-[#94a3b8] py-8 animate-pulse font-bold tracking-widest uppercase text-sm">Đang tải thêm...</div>}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div onClick={() => setSelectedPost(null)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div onClick={(e) => e.stopPropagation()} className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-[2.5rem] w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in zoom-in-95">
            <button onClick={() => setSelectedPost(null)} className="absolute top-6 right-6 text-[#64748b] hover:text-white bg-[#1e293b] p-2 rounded-xl transition-all">
              <X size={20} />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <img src={selectedPost.author.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4"} className="w-12 h-12 rounded-2xl ring-2 ring-[#1e3a52] object-cover" alt="avatar" />
              <div>
                <div className="text-white font-bold text-lg">{selectedPost.author.username}</div>
                <div className="text-[#64748b] text-sm">{formatDateTime(selectedPost.createdAt)}</div>
              </div>
            </div>

            <div className="text-[#cbd5e1] text-lg mb-6 leading-relaxed whitespace-pre-wrap">{selectedPost.content}</div>

            {selectedPost.imageUrl && (
              <div className="rounded-[2rem] overflow-hidden border border-[#1e3a52] mb-8 bg-black/20">
                <img src={selectedPost.imageUrl} className="w-full h-auto max-h-[600px] object-contain mx-auto" alt="post" />
              </div>
            )}

            <div className="border-t border-[#1e3a52] pt-8">
              <h4 className="text-white font-black text-xl mb-6 uppercase tracking-tight">Bình luận</h4>

              <div className="flex items-center gap-3 mb-8">
                <input
                  value={modalCommentText}
                  onChange={(e) => setModalCommentText(e.target.value)}
                  placeholder="Viết cảm nghĩ của bạn..."
                  className="flex-1 bg-[#1e293b]/50 border border-[#334155] rounded-2xl px-6 py-3 text-[#cbd5e1] outline-none focus:border-blue-500/50 transition-all font-medium"
                />
                <button
                  onClick={async () => {
                    const text = modalCommentText.trim();
                    if (!text) return;
                    try {
                      await postApi.comments.create(selectedPost!.id, { content: text });
                      setModalCommentText("");
                      loadComments(selectedPost!.id, null);
                    } catch { }
                  }}
                  className="bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  Gửi
                </button>
              </div>

              <div className="space-y-6">
                {(commentsByPost[selectedPost.id] || []).map((c) => (
                  <div key={c.id} className="bg-[#1e293b]/30 p-5 rounded-2xl border border-[#334155]/50 group">
                    <div className="text-[#94a3b8] text-xs mb-2 font-bold opacity-60 group-hover:opacity-100 transition-opacity">{formatTime(c.createdAt)}</div>
                    <div className="text-[#cbd5e1] font-medium leading-relaxed">{c.content}</div>
                  </div>
                ))}
                {!(commentsByPost[selectedPost.id]?.length) && !commentsLoadingByPost[selectedPost.id] && (
                  <div className="text-center py-8 text-[#475569] font-medium italic">Chưa có bình luận nào ở đây cả.</div>
                )}
                {commentsLoadingByPost[selectedPost.id] && (
                  <div className="text-center py-4 text-blue-500 animate-pulse font-bold">Đang tải bình luận...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  } catch { return iso; }
};
const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};
