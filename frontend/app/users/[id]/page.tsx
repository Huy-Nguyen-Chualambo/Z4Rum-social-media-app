"use client";
import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { userApi } from "@/lib/api/userApi";
import { postApi } from "@/lib/api/postApi";
import { useToast } from "@/lib/ui/toast";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Image as ImageIcon, Edit3, Save, X, Settings, LogOut } from "lucide-react";
import RequireAuth from "@/app/_components/RequireAuth";

type FeedPost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  author: { id: string; username: string; avatarUrl?: string | null };
};

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

  const formatDateTime = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "UTC" });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {items.map((p) => (
              <div key={p.id} className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-4">
                <div className="text-[#cbd5e1] mb-2">{p.content}</div>
                {p.imageUrl && <img src={p.imageUrl} alt="post" className="rounded-xl" />}
                <div className="text-[#64748b] text-xs">{formatDateTime(p.createdAt)}</div>
              </div>
            ))}
          </div>
          <div ref={sentinelRef} className="h-10" />
          {loading && <div className="text-center text-[#94a3b8] py-4">Đang tải...</div>}
        </>
      ) : (
        <div className="text-red-400">Không tìm thấy người dùng.</div>
      )}
    </div>
  );
}


