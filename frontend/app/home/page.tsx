"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import RequireAuth from "../_components/RequireAuth";
import { MessageCircle, Heart, Send, MoreHorizontal, Image as ImageIcon, Smile, Bookmark, Trash2, Share2, Link as LinkIcon } from "lucide-react";
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
        // Optimistically unlike
        const nextLikedSet = likedSet.filter((x) => x !== post.id);
        localStorage.setItem("z4rum_liked_posts", JSON.stringify(nextLikedSet));
        const nextCount = Math.max(0, (counts[post.id] ?? localLikes ?? 0) - 1);
        counts[post.id] = nextCount;
        localStorage.setItem("z4rum_like_counts", JSON.stringify(counts));
        setLiked(false);
        setLocalLikes(nextCount);
      } else {
        // Optimistically like
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
      // Fallback optimistic update if localStorage fails
      if (liked) {
        setLiked(false);
        setLocalLikes(Math.max(0, localLikes - 1));
      } else {
        setLiked(true);
        setLocalLikes(localLikes + 1);
      }
    }

    // Sync with backend toggle (best-effort). Backend returns the canonical likes count.
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
        // rollback to previous state on failure
        setLiked(prevLiked);
        setLocalLikes(prevCount);
        try {
          const likedSetRaw = localStorage.getItem("z4rum_liked_posts");
          const likedSet: string[] = likedSetRaw ? JSON.parse(likedSetRaw) : [];
          const countsRaw = localStorage.getItem("z4rum_like_counts");
          const counts: Record<string, number> = countsRaw ? JSON.parse(countsRaw) : {};
          if (prevLiked) {
            if (!likedSet.includes(post.id)) likedSet.push(post.id);
            localStorage.setItem("z4rum_liked_posts", JSON.stringify(likedSet));
          } else {
            const nextLikedSet = likedSet.filter((x) => x !== post.id);
            localStorage.setItem("z4rum_liked_posts", JSON.stringify(nextLikedSet));
          }
          counts[post.id] = prevCount;
          localStorage.setItem("z4rum_like_counts", JSON.stringify(counts));
        } catch { }
      })
      .finally(() => setLiking(false));
  };

  const handleSubmitComment = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = commentText.trim();
    if (!text) {
      push("Nội dung bình luận trống", "error");
      return;
    }
    onAddComment?.(post.id, text);
    setCommentText("");
    setCommenting(false);
    push("Đã thêm bình luận", "success");
  };

  const handleCopyLink = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const url = typeof window !== "undefined" ? `${window.location.origin}/posts/${post.id}` : post.id;
      await navigator.clipboard.writeText(url);
      push("Đã sao chép liên kết", "success");
    } catch {
      push("Không thể sao chép", "error");
    } finally {
      setMenuOpen(false);
    }
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/posts/${post.id}` : "";
      if (navigator.share) {
        await navigator.share({ title: "Chia sẻ bài viết", text: post.content, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        push("Đã sao chép liên kết để chia sẻ", "success");
      }
    } catch {
    } finally {
      setMenuOpen(false);
    }
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await postApi.remove(post.id);
      onDeleted?.(post.id);
      push("Đã xoá bài viết", "success");
    } catch (e: any) {
      push(e?.response?.data?.error || "Xoá bài viết thất bại", "error");
    } finally {
      setMenuOpen(false);
    }
  };

  const isOwner = currentUserId && post.author.id === currentUserId;

  return (
    <article onClick={() => onOpen?.(post)} className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-4 sm:p-5 hover:border-[#2d5a7b] transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20 cursor-pointer">
      <header className="flex items-center gap-3 mb-3 sm:mb-4 relative">
        <Link href={`/users/${post.author.id}`}>
          <img src={post.author.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4"} alt="avatar" className="w-12 h-12 rounded-full object-cover ring-2 ring-[#1e3a52]" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/users/${post.author.id}`} className="text-white font-semibold text-sm hover:underline cursor-pointer">
              {post.author.username}
            </Link>
            <span className="text-[#64748b] text-xs">·</span>
            <span className="text-[#64748b] text-xs">{formatDateTime(post.createdAt)}</span>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }} className="text-[#64748b] hover:text-white hover:bg-[#1e293b] p-2 rounded-lg transition-colors">
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <div className="absolute right-2 top-10 bg-[#0b1728] border border-[#1e3a52] rounded-lg shadow-xl z-10 w-44">
            <button onClick={(e) => handleCopyLink(e)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#cbd5e1] hover:bg-[#12243a]">
              <LinkIcon size={16} /> Sao chép liên kết
            </button>
            <button onClick={(e) => handleShare(e)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#cbd5e1] hover:bg-[#12243a]">
              <Share2 size={16} /> Chia sẻ
            </button>
            {isOwner && (
              <button onClick={(e) => handleDelete(e)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-[#2a0f17]">
                <Trash2 size={16} /> Xoá bài viết
              </button>
            )}
          </div>
        )}
      </header>

      <p className="text-[#cbd5e1] text-sm leading-relaxed mb-3">{post.content}</p>

      {post.imageUrl && (
        <div className="mb-3 sm:mb-4 rounded-xl overflow-hidden group cursor-pointer">
          <div className="w-full aspect-square bg-black/20">
            <img src={post.imageUrl} alt="post media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        </div>
      )}

      <footer className="flex items-center justify-between text-[#cbd5e1] pt-3 border-t border-[#1e293b]">
        <div className="flex items-center gap-5">
          <button onClick={(e) => handleLike(e)} className={`flex items-center gap-2 hover:text-pink-500 transition-colors group ${liked ? "text-pink-500" : "text-[#cbd5e1]"}`}>
            <Heart size={20} className={`group-hover:scale-110 transition-transform ${liked ? "fill-current" : ""}`} />
            <span className="text-sm font-medium">{localLikes}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onOpen?.(post); }} className="flex items-center gap-2 hover:text-blue-400 transition-colors group">
            <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">{commentCount}</span>
          </button>
          <button className="flex items-center gap-2 hover:text-green-400 transition-colors group">
            <Send onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }} size={20} className="group-hover:scale-110 transition-transform" />
            {/*   <span className="text-sm font-medium">0</span>*/}
          </button>
        </div>
        {/*   <button className="text-[#64748b] hover:text-white">
          <Bookmark size={20} />
        </button> */}
      </footer>
      {commenting && (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Viết bình luận..."
            className="flex-1 bg-transparent outline-none text-[#cbd5e1] placeholder:text-[#475569] border-b border-[#1e3a52]"
          />
          <button onClick={(e) => handleSubmitComment(e)} className="px-3 py-1 text-sm bg-[#12304a] text-white rounded-md hover:bg-[#163b59]">Gửi</button>
        </div>
      )}
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
  const [newContent, setNewContent] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, { id: string; content: string; createdAt: string }[]>>({});
  const [commentDeltaByPost, setCommentDeltaByPost] = useState<Record<string, number>>({});
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [commentsCursorByPost, setCommentsCursorByPost] = useState<Record<string, string | null>>({});
  const [commentsLoadingByPost, setCommentsLoadingByPost] = useState<Record<string, boolean>>({});
  const [modalCommentText, setModalCommentText] = useState("");
  const [liveLikesByPost, setLiveLikesByPost] = useState<Record<string, number>>({});

  const loadComments = async (postId: string, cursor?: string | null) => {
    const loading = commentsLoadingByPost[postId];
    if (loading) return;
    setCommentsLoadingByPost((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await postApi.comments.list(postId, { limit: 20, cursor: cursor || undefined });
      setCommentsByPost((prev) => {
        const list = prev[postId] || [];
        // merge and de-dup by id
        const map = new Map<string, { id: string; content: string; createdAt: string }>();
        for (const c of [...list, ...res.items]) map.set(c.id, c as any);
        return { ...prev, [postId]: Array.from(map.values()) };
      });
      setCommentsCursorByPost((prev) => ({ ...prev, [postId]: res.nextCursor }));
    } catch (e: any) {
      push(e?.response?.data?.error || "Tải bình luận thất bại", "error");
    } finally {
      setCommentsLoadingByPost((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const openPost = (post: FeedPost) => {
    setSelectedPost(post);
    setModalCommentText("");
    // initial load
    loadComments(post.id, null);
  };

  useEffect(() => {
    if (selectedPost) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selectedPost]);

  const load = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await postApi.list({ limit: 10, cursor: cursor || undefined });
      setItems((prev) => {
        const dedupMap = new Map<string, FeedPost>();
        // Preserve existing order first
        for (const p of prev) dedupMap.set(p.id, p);
        // Append new items, overriding by id if needed
        for (const p of res.items) dedupMap.set(p.id, p);
        return Array.from(dedupMap.values());
      });
      setCursor(res.nextCursor);
    } catch (e: any) {
      push(e?.response?.data?.error || "Tải bài viết thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime like updates
  useEffect(() => {
    if (!socket) return;
    const onLikeUpdated = ({ postId, likes }: { postId: string; likes: number }) => {
      setLiveLikesByPost((prev) => ({ ...prev, [postId]: likes }));
    };
    socket.on("post:likeUpdated", onLikeUpdated);
    return () => {
      socket.off("post:likeUpdated", onLikeUpdated);
    };
  }, [socket]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && cursor) {
        load();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor]);

  const handleCreate = async () => {
    if (!newContent.trim()) {
      push("Vui lòng nhập nội dung", "error");
      return;
    }
    if (creating) return;
    setCreating(true);
    try {
      const created = await postApi.create({ content: newContent.trim(), imageUrl: newImageUrl.trim() || undefined });
      // The list API includes author; create returns post without populated author.
      // Optimistically prepend with minimal data; next list fetch will normalize.
      setItems((prev) => {
        const newItem: FeedPost = {
          id: created.id,
          content: created.content,
          imageUrl: created.imageUrl,
          createdAt: created.createdAt,
          author: created.author || { id: "me", username: "Bạn", avatarUrl: undefined },
        };
        const filtered = prev.filter((p) => p.id !== created.id);
        return [newItem, ...filtered];
      });
      setNewContent("");
      setNewImageUrl("");
      push("Đăng bài thành công", "success");
    } catch (e: any) {
      push(e?.response?.data?.error || "Đăng bài thất bại", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <RequireAuth />
      <div className="mb-6">
        <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] p-5 rounded-2xl">
          <div className="flex items-start gap-4">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} className="w-12 h-12 rounded-full ring-2 ring-[#1e3a52]" alt="profile" />) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] via-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                Z
              </div>
            )}
            <div className="flex-1">
              <input
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Chia sẻ gì đó..."
                className="bg-transparent w-full outline-none text-[#cbd5e1] placeholder:text-[#475569] mb-3"
              />

              {/* Hidden File Input */}
              <input
                type="file"
                id="home-file-upload"
                className="hidden"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  if (file.size > 5 * 1024 * 1024) {
                    push("Ảnh quá lớn (chỉ hỗ trợ < 5MB)", "error");
                    return;
                  }

                  setIsUploading(true);
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("upload_preset", "Z4rum_assets");
                  formData.append("cloud_name", "djm2wewi2");

                  try {
                    const res = await fetch("https://api.cloudinary.com/v1_1/djm2wewi2/image/upload", {
                      method: "POST",
                      body: formData,
                    });

                    const data = await res.json();
                    if (data.secure_url) {
                      setNewImageUrl(data.secure_url);
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
                }}
              />

              {/* Image Preview */}
              {(newImageUrl || isUploading) && (
                <div className="mb-4 relative group w-fit">
                  {isUploading ? (
                    <div className="w-48 h-32 bg-[#1e293b] rounded-xl flex flex-col items-center justify-center animate-pulse border border-[#1e3a52]">
                      <div className="w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-[#64748b] text-xs">Đang tải...</span>
                    </div>
                  ) : (
                    <>
                      <img src={newImageUrl} alt="preview" className="max-w-full rounded-xl max-h-48 object-cover" />
                      <button
                        onClick={() => setNewImageUrl("")}
                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    className="text-[#60A5FA] hover:bg-[#1e293b] p-2 rounded-lg transition-colors"
                    type="button"
                    onClick={() => document.getElementById("home-file-upload")?.click()}
                    disabled={isUploading}
                  >
                    <ImageIcon size={18} />
                  </button>
                  <button className="text-[#60A5FA] hover:bg-[#1e293b] p-2 rounded-lg transition-colors" type="button">
                    <Smile size={18} />
                  </button>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newContent.trim() || isUploading}
                  className="px-5 py-2 bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-105 disabled:opacity-60"
                >
                  {creating ? "Đang đăng..." : "Đăng"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {items.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            currentUserId={user?.id}
            onDeleted={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
            onAddComment={(postId, content) =>
              setCommentsByPost((prev) => {
                const list = prev[postId] || [];
                return {
                  ...prev,
                  [postId]: [
                    { id: `${postId}-${Date.now()}`, content, createdAt: new Date().toISOString() },
                    ...list,
                  ],
                };
              })
            }
            onOpen={(post) => openPost(post)}
            likesCount={(liveLikesByPost[p.id] ?? (p._count?.likes ?? 0))}
            commentCount={(p._count?.comments || 0) + (commentDeltaByPost[p.id] || 0)}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="h-10" />
      {loading && <div className="text-center text-[#94a3b8] py-4">Đang tải...</div>}

      {selectedPost && (
        <div onClick={() => setSelectedPost(null)} className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl w-full max-w-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-3 mb-3">
              <img src={selectedPost.author.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4"} className="w-10 h-10 rounded-full ring-2 ring-[#1e3a52]" alt="avatar" />
              <div className="flex-1">
                <div className="text-white font-semibold text-sm">{selectedPost.author.username}</div>
                <div className="text-[#64748b] text-xs">{formatDateTime(selectedPost.createdAt)}</div>
              </div>
              <button onClick={() => setSelectedPost(null)} className="text-[#64748b] hover:text-white">✕</button>
            </div>
            <div className="text-[#cbd5e1] mb-3">{selectedPost.content}</div>
            {selectedPost.imageUrl && <img src={selectedPost.imageUrl} className="rounded-xl mb-4" alt="post" />}
            <div className="border-t border-[#1e293b] pt-3">
              <div className="text-[#94a3b8] text-sm mb-2">Bình luận</div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={modalCommentText}
                  onChange={(e) => setModalCommentText(e.target.value)}
                  placeholder="Viết bình luận..."
                  className="flex-1 bg-transparent outline-none text-[#cbd5e1] placeholder:text-[#475569] border-b border-[#1e3a52]"
                />
                <button
                  onClick={async () => {
                    if (!selectedPost) return;
                    const text = modalCommentText.trim();
                    if (!text) return;
                    try {
                      const r = await postApi.comments.create(selectedPost.id, { content: text });
                      setCommentsByPost((prev) => ({
                        ...prev,
                        [selectedPost.id]: [r.item as any, ...(prev[selectedPost.id] || [])],
                      }));
                      setCommentDeltaByPost((prev) => ({ ...prev, [selectedPost.id]: (prev[selectedPost.id] || 0) + 1 }));
                      setModalCommentText("");
                    } catch (e: any) {
                      push(e?.response?.data?.error || "Gửi bình luận thất bại", "error");
                    }
                  }}
                  className="px-3 py-1 text-sm bg-[#12304a] text-white rounded-md hover:bg-[#163b59]"
                >
                  Gửi
                </button>
              </div>
              <div className="flex flex-col gap-3 max-h-72 overflow-auto pr-2">
                {(commentsByPost[selectedPost.id] || []).map((c) => (
                  <div key={c.id} className="text-[#cbd5e1] text-sm">
                    <span className="text-[#64748b] text-xs mr-2">{formatTime(c.createdAt)}</span>
                    {c.content}
                  </div>
                ))}
                {!(commentsByPost[selectedPost.id]?.length) && (
                  <div className="text-[#64748b] text-sm">Chưa có bình luận.</div>
                )}
                {commentsCursorByPost[selectedPost.id] && (
                  <button
                    onClick={() => loadComments(selectedPost.id, commentsCursorByPost[selectedPost.id])}
                    className="self-center text-[#60A5FA] text-sm hover:underline"
                  >
                    Tải thêm
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const formatDateTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
