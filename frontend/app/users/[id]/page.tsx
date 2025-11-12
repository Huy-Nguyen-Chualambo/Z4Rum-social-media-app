"use client";
import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { userApi } from "@/lib/api/userApi";
import { postApi } from "@/lib/api/postApi";
import { useToast } from "@/lib/ui/toast";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useSocketStore } from "@/lib/store/useSocketStore";
import { Image as ImageIcon, Edit3, Save, X, Settings, LogOut, Trash2, Heart, MessageCircle, Send, MoreHorizontal, Share2, Link as LinkIcon } from "lucide-react";
import RequireAuth from "@/app/_components/RequireAuth";

type FeedPost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  author: { id: string; username: string; avatarUrl?: string | null };
  _count?: { likes: number; comments: number };
};

function PostCardItem({
  post,
  isEditing,
  isOwnerPost,
  onEdit,
  onDelete,
  deletingPostId,
  editPostContent,
  setEditPostContent,
  editPostImageUrl,
  setEditPostImageUrl,
  savingPost,
  onSave,
  onCancel,
  onOpen,
  currentUserId,
  likesCount,
  commentCount,
  formatDateTime,
}: {
  post: FeedPost;
  isEditing: boolean;
  isOwnerPost: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deletingPostId: string | null;
  editPostContent: string;
  setEditPostContent: (v: string) => void;
  editPostImageUrl: string;
  setEditPostImageUrl: (v: string) => void;
  savingPost: boolean;
  onSave: () => void;
  onCancel: () => void;
  onOpen: () => void;
  currentUserId?: string;
  likesCount: number;
  commentCount: number;
  formatDateTime: (iso: string) => string;
}) {
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(0);
  const [liking, setLiking] = useState(false);
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
    } catch {}
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
        } catch {}
      })
      .catch(() => {
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
        } catch {}
      })
      .finally(() => setLiking(false));
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

  const isOwner = currentUserId && post.author.id === currentUserId;

  return (
    <article className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-4 sm:p-5 hover:border-[#2d5a7b] transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20 relative">
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
        {isOwnerPost && !isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 text-[#60A5FA] hover:bg-[#1e293b] rounded-lg transition-colors"
              title="Sửa bài viết"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={deletingPostId === post.id}
              className="p-2 text-red-400 hover:bg-[#2a0f17] rounded-lg transition-colors disabled:opacity-50"
              title="Xóa bài viết"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        {!isEditing && (
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }} className="text-[#64748b] hover:text-white hover:bg-[#1e293b] p-2 rounded-lg transition-colors">
            <MoreHorizontal size={18} />
          </button>
        )}
        {menuOpen && (
          <div className="absolute right-2 top-10 bg-[#0b1728] border border-[#1e3a52] rounded-lg shadow-xl z-10 w-44">
            <button onClick={(e) => handleCopyLink(e)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#cbd5e1] hover:bg-[#12243a]">
              <LinkIcon size={16} /> Sao chép liên kết
            </button>
            <button onClick={(e) => handleShare(e)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#cbd5e1] hover:bg-[#12243a]">
              <Share2 size={16} /> Chia sẻ
            </button>
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-[#2a0f17]"
              >
                <Trash2 size={16} /> Xoá bài viết
              </button>
            )}
          </div>
        )}
      </header>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editPostContent}
            onChange={(e) => setEditPostContent(e.target.value)}
            placeholder="Nội dung bài viết"
            className="w-full bg-transparent outline-none text-[#cbd5e1] placeholder:text-[#475569] border border-[#1e3a52] rounded-lg p-3 min-h-[100px] resize-none"
          />
          <input
            value={editPostImageUrl}
            onChange={(e) => setEditPostImageUrl(e.target.value)}
            placeholder="Image URL (tuỳ chọn)"
            className="w-full bg-transparent outline-none text-[#cbd5e1] placeholder:text-[#475569] border border-[#1e3a52] rounded-lg p-2"
          />
          {editPostImageUrl && (
            <div className="mt-2">
              <img src={editPostImageUrl} alt="preview" className="rounded-xl max-h-64 object-cover" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              disabled={savingPost || !editPostContent.trim()}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} /> {savingPost ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              onClick={onCancel}
              disabled={savingPost}
              className="px-4 py-2 text-sm bg-[#2a0f17] text-red-300 rounded-lg hover:bg-[#3a121c] disabled:opacity-50 flex items-center gap-2"
            >
              <X size={16} /> Huỷ
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[#cbd5e1] text-sm leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>

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
              <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="flex items-center gap-2 hover:text-blue-400 transition-colors group">
                <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">{commentCount}</span>
              </button>
              <button className="flex items-center gap-2 hover:text-green-400 transition-colors group">
                <Send onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }} size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </footer>
        </>
      )}
    </article>
  );
}

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id as string;
  const router = useRouter();
  const { push } = useToast();
  const { user: me, logout } = useAuthStore();

  const [profile, setProfile] = useState<{ id: string; username: string; avatarUrl?: string; bio?: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [username, setUsername] = useState("");

  const [items, setItems] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostImageUrl, setEditPostImageUrl] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, { id: string; content: string; createdAt: string }[]>>({});
  const [commentDeltaByPost, setCommentDeltaByPost] = useState<Record<string, number>>({});
  const [commentsCursorByPost, setCommentsCursorByPost] = useState<Record<string, string | null>>({});
  const [commentsLoadingByPost, setCommentsLoadingByPost] = useState<Record<string, boolean>>({});
  const [modalCommentText, setModalCommentText] = useState("");
  const [liveLikesByPost, setLiveLikesByPost] = useState<Record<string, number>>({});
  const { socket } = useSocketStore();

  const formatDateTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingProfile(true);
        const u = await userApi.get(userId);
        if (!mounted) return;
        setProfile(u);
        setAvatarUrl(u.avatarUrl || "");
        setBio(u.bio || "");
        setGender((u as any).gender || "");
        setUsername(u.username || "");
      } catch (e: any) {
        push(e?.response?.data?.error || "Không tải được hồ sơ", "error");
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId, push]);

  const load = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await postApi.list({ limit: 10, cursor: cursor || undefined, authorId: userId });
      setItems((prev) => {
        const map = new Map<string, FeedPost>();
        for (const p of prev) map.set(p.id, p);
        for (const p of res.items) map.set(p.id, p);
        return Array.from(map.values());
      });
      setCursor(res.nextCursor);
    } catch (e: any) {
      push(e?.response?.data?.error || "Tải bài viết thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setCursor(null);
    // initial load
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

  const isOwner = me?.id === userId;

  const startEdit = () => {
    setEditing(true);
  };
  const cancelEdit = () => {
    setAvatarUrl(profile?.avatarUrl || "");
    setBio(profile?.bio || "");
    setGender((profile as any)?.gender || "");
    setUsername(profile?.username || "");
    setEditing(false);
  };
  const saveEdit = async () => {
    if (!profile) return;
    try {
      const updated = await userApi.update(profile.id, { 
        username: username.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined, 
        bio: bio.trim(), 
        gender: gender as any 
      });
      setProfile((prev) => (prev ? { ...prev, username: updated.username, avatarUrl: updated.avatarUrl, bio: updated.bio, gender: (updated as any).gender } : prev));
      push("Đã cập nhật hồ sơ", "success");
      setEditing(false);
    } catch (e: any) {
      push(e?.response?.data?.error || "Cập nhật thất bại", "error");
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const startEditPost = (post: FeedPost) => {
    setEditingPostId(post.id);
    setEditPostContent(post.content);
    setEditPostImageUrl(post.imageUrl || "");
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditPostContent("");
    setEditPostImageUrl("");
  };

  const savePost = async (postId: string) => {
    if (savingPost) return;
    setSavingPost(true);
    try {
      const updated = await postApi.update(postId, {
        content: editPostContent.trim(),
        imageUrl: editPostImageUrl.trim() || undefined,
      });
      setItems((prev) => prev.map((p) => (p.id === postId ? { ...p, content: updated.content, imageUrl: updated.imageUrl } : p)));
      push("Đã cập nhật bài viết", "success");
      cancelEditPost();
    } catch (e: any) {
      push(e?.response?.data?.error || "Cập nhật bài viết thất bại", "error");
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (deletingPostId) return;
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    setDeletingPostId(postId);
    try {
      await postApi.remove(postId);
      setItems((prev) => prev.filter((p) => p.id !== postId));
      push("Đã xóa bài viết", "success");
    } catch (e: any) {
      push(e?.response?.data?.error || "Xóa bài viết thất bại", "error");
    } finally {
      setDeletingPostId(null);
    }
  };

  const loadComments = async (postId: string, cursor?: string | null) => {
    const loading = commentsLoadingByPost[postId];
    if (loading) return;
    setCommentsLoadingByPost((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await postApi.comments.list(postId, { limit: 20, cursor: cursor || undefined });
      setCommentsByPost((prev) => {
        const list = prev[postId] || [];
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <RequireAuth />
      {loadingProfile ? (
        <div className="text-[#94a3b8]">Đang tải hồ sơ...</div>
      ) : profile ? (
        <>
          <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-4">
              <img src={profile.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4"} className="w-20 h-20 rounded-full ring-2 ring-[#1e3a52]" alt="avatar" />
              <div className="flex-1">
                <h1 className="text-white text-lg font-semibold">{profile.username}</h1>
                {!editing ? (
                  <>
                    <p className="text-[#cbd5e1] mt-2 whitespace-pre-wrap">{profile.bio || "Chưa có giới thiệu."}</p>
                    <div className="text-[#94a3b8] mt-1">Giới tính: {(profile as any).gender === "male" ? "Nam" : (profile as any).gender === "female" ? "Nữ" : "Chưa chọn"}</div>
                  </>
                ) : (
                  <div className="mt-2 space-y-2">
                    <input 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="Tên người dùng" 
                      className="w-full bg-transparent outline-none text-[#cbd5e1] placeholder:text-[#475569] border border-[#1e3a52] rounded-lg p-2" 
                    />
                    <div className="flex items-center gap-2">
                      <ImageIcon size={16} className="text-[#60A5FA]" />
                      <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Avatar URL" className="bg-transparent flex-1 outline-none text-[#cbd5e1] placeholder:text-[#475569] border-b border-[#1e3a52]" />
                    </div>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Giới thiệu ngắn" className="w-full bg-transparent outline-none text-[#cbd5e1] placeholder:text-[#475569] border border-[#1e3a52] rounded-lg p-2 min-h-[80px]" />
                    <div className="flex items-center gap-6 text-[#cbd5e1]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="gender" checked={gender === "male"} onChange={() => setGender("male")} /> Nam
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="gender" checked={gender === "female"} onChange={() => setGender("female")} /> Nữ
                      </label>
                    </div>
                  </div>
                )}
              </div>
              {isOwner && (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {!editing ? (
                      <>
                        <button onClick={startEdit} className="px-3 py-2 text-sm bg-[#12304a] text-white rounded-lg hover:bg-[#163b59] flex items-center gap-2">
                          <Edit3 size={16} /> Sửa hồ sơ
                        </button>
                        <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-2 text-sm bg-[#1e3a52] text-white rounded-lg hover:bg-[#2d5a7b] flex items-center gap-2">
                          <Settings size={16} /> Cài đặt
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={saveEdit} className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                          <Save size={16} /> Lưu
                        </button>
                        <button onClick={cancelEdit} className="px-3 py-2 text-sm bg-[#2a0f17] text-red-300 rounded-lg hover:bg-[#3a121c] flex items-center gap-2">
                          <X size={16} /> Huỷ
                        </button>
                      </>
                    )}
                  </div>
                  {showSettings && !editing && (
                    <div className="mt-2 w-full bg-[#0a1628] border border-[#1e3a52] rounded-lg p-4">
                      <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                        <Settings size={16} /> Cài đặt
                      </h3>
                      <div className="space-y-3">
                        <div className="text-[#cbd5e1] text-sm">
                          <div className="text-[#94a3b8] mb-1">Tên người dùng:</div>
                          <div className="text-white">{profile.username}</div>
                        </div>
                        <div className="text-[#cbd5e1] text-sm">
                          <div className="text-[#94a3b8] mb-1">ID:</div>
                          <div className="text-white font-mono text-xs">{profile.id}</div>
                        </div>
                        <div className="pt-3 border-t border-[#1e3a52]">
                          <button
                            onClick={handleLogout}
                            className="w-full px-3 py-2 text-sm bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 flex items-center justify-center gap-2 transition-colors"
                          >
                            <LogOut size={16} /> Đăng xuất
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!isOwner && (
                <a href={`/messages/${userId}`} className="px-3 py-2 text-sm bg-[#12304a] text-white rounded-lg hover:bg-[#163b59]">Nhắn tin</a>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {items.map((p) => {
              const isEditing = editingPostId === p.id;
              const isOwnerPost = isOwner && p.author.id === userId;
              return (
                <PostCardItem
                  key={p.id}
                  post={p}
                  isEditing={isEditing}
                  isOwnerPost={isOwnerPost}
                  onEdit={() => startEditPost(p)}
                  onDelete={() => handleDeletePost(p.id)}
                  deletingPostId={deletingPostId}
                  editPostContent={editPostContent}
                  setEditPostContent={setEditPostContent}
                  editPostImageUrl={editPostImageUrl}
                  setEditPostImageUrl={setEditPostImageUrl}
                  savingPost={savingPost}
                  onSave={() => savePost(p.id)}
                  onCancel={cancelEditPost}
                  onOpen={() => openPost(p)}
                  currentUserId={me?.id}
                  likesCount={liveLikesByPost[p.id] ?? (p._count?.likes ?? 0)}
                  commentCount={(p._count?.comments || 0) + (commentDeltaByPost[p.id] || 0)}
                  formatDateTime={formatDateTime}
                />
              );
            })}
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
        </>
      ) : (
        <div className="text-red-400">Không tìm thấy người dùng.</div>
      )}
    </div>
  );
}


