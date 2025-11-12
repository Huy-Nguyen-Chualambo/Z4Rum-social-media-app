"use client";
import React, { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users, FileText, Loader2 } from "lucide-react";
import RequireAuth from "../_components/RequireAuth";
import { userApi } from "@/lib/api/userApi";
import { postApi } from "@/lib/api/postApi";
import { useToast } from "@/lib/ui/toast";

type UserSummary = {
  id: string;
  username: string;
  avatarUrl?: string | null;
};

type PostSummary = {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  author: { id: string; username: string; avatarUrl?: string | null };
  _count?: { likes?: number; comments?: number };
};

const fallbackAvatar = "https://avatars.githubusercontent.com/u/0?v=4";

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  } catch {
    return "";
  }
};

const truncate = (value: string, max = 180) => {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}…` : value;
};

export default function ExplorePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [userResults, setUserResults] = useState<UserSummary[]>([]);
  const [postResults, setPostResults] = useState<PostSummary[]>([]);
  const { push } = useToast();

  const hasQuery = submittedQuery.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    if (!hasQuery) {
      setUserResults([]);
      setPostResults([]);
      setLoading(false);
      return;
    }

    const runSearch = async () => {
      setLoading(true);
      try {
        const [users, postsRes] = await Promise.all([
          userApi.search(submittedQuery.trim()),
          postApi.list({ limit: 20, search: submittedQuery.trim() }) as Promise<{ items: PostSummary[]; nextCursor: string | null }>,
        ]);
        if (cancelled) return;
        setUserResults(users);
        setPostResults(postsRes.items || []);
      } catch (e: any) {
        if (cancelled) return;
        push(e?.response?.data?.error || "Tìm kiếm thất bại", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [hasQuery, submittedQuery, push]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittedQuery(query.trim());
  };

  const handleClear = () => {
    setQuery("");
    setSubmittedQuery("");
    setUserResults([]);
    setPostResults([]);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] font-sans text-[#F1F5F9]">
      <RequireAuth />
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
        <section className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-6">
          <h1 className="text-white text-2xl font-bold mb-2">Khám phá</h1>
          <p className="text-[#cbd5e1] text-sm mb-5">Tìm kiếm bạn bè và bài viết thú vị từ cộng đồng.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nhập tên người dùng hoặc nội dung bài viết..."
                className="w-full bg-[#091427] border border-[#1e3a52] rounded-xl py-3 pl-10 pr-3 text-sm text-[#cbd5e1] outline-none focus:border-[#3B82F6] transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all"
              >
                Tìm kiếm
              </button>
              {hasQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-3 text-sm font-semibold rounded-xl border border-[#1e3a52] text-[#cbd5e1] hover:bg-[#13203a] transition-colors"
                >
                  Xoá
                </button>
              )}
            </div>
          </form>
          {hasQuery && (
            <div className="mt-4 text-sm text-[#94a3b8]">
              Kết quả cho <span className="text-white font-medium">"{submittedQuery}"</span>
            </div>
          )}
        </section>

        {!hasQuery ? (
          <section className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-6 text-[#cbd5e1] text-sm leading-relaxed">
            <p className="mb-2 text-white font-semibold">Gợi ý</p>
            <ul className="space-y-2 list-disc list-inside text-[#94a3b8]">
              <li>Nhập tên người dùng để tìm bạn bè mới.</li>
              <li>Tìm kiếm theo chủ đề, cảm xúc hoặc sự kiện để xem bài viết liên quan.</li>
              <li>Sử dụng bộ lọc từ khóa ngắn gọn để có kết quả chính xác hơn.</li>
            </ul>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-6">
              <header className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-[#13203a] text-[#60A5FA]">
                  <Users size={20} />
                </div>
                <h2 className="text-white text-lg font-semibold">Tài khoản</h2>
              </header>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
                  <Loader2 size={16} className="animate-spin" /> Đang tìm kiếm tài khoản...
                </div>
              )}
              {!loading && userResults.length === 0 && (
                <div className="text-sm text-[#64748b]">Không tìm thấy tài khoản phù hợp.</div>
              )}
              <div className="space-y-3">
                {userResults.map((user) => (
                  <Link
                    key={user.id}
                    href={`/users/${user.id}`}
                    className="flex items-center gap-3 rounded-xl border border-transparent hover:border-[#2d5a7b] hover:bg-[#0d1b2f] transition-all p-3"
                  >
                    <img
                      src={user.avatarUrl || fallbackAvatar}
                      alt={user.username}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-[#1e3a52]"
                    />
                    <div>
                      <div className="text-white font-medium">{user.username}</div>
                      <div className="text-xs text-[#64748b]">Xem hồ sơ</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-6">
              <header className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-[#13203a] text-[#F97316]">
                  <FileText size={20} />
                </div>
                <h2 className="text-white text-lg font-semibold">Bài viết</h2>
              </header>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
                  <Loader2 size={16} className="animate-spin" /> Đang tìm kiếm bài viết...
                </div>
              )}
              {!loading && postResults.length === 0 && (
                <div className="text-sm text-[#64748b]">Không tìm thấy bài viết phù hợp.</div>
              )}
              <div className="space-y-4">
                {postResults.map((post) => (
                  <article 
                    key={post.id} 
                    onClick={() => router.push(`/users/${post.author.id}`)}
                    className="rounded-xl border border-transparent hover:border-[#2d5a7b] hover:bg-[#0d1b2f] transition-all p-4 cursor-pointer"
                  >
                    <header className="flex items-center gap-3 mb-3">
                      <Link href={`/users/${post.author.id}`} onClick={(e) => e.stopPropagation()}>
                        <img
                          src={post.author.avatarUrl || fallbackAvatar}
                          alt={post.author.username}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-[#1e3a52]"
                        />
                      </Link>
                      <div>
                        <Link href={`/users/${post.author.id}`} onClick={(e) => e.stopPropagation()} className="text-white text-sm font-semibold hover:underline">
                          {post.author.username}
                        </Link>
                        <div className="text-xs text-[#64748b]">{formatDateTime(post.createdAt)}</div>
                      </div>
                    </header>
                    <p className="text-sm text-[#cbd5e1] leading-relaxed">{truncate(post.content)}</p>
                    {post.imageUrl && (
                      <div className="mt-3">
                        <img src={post.imageUrl} alt="post" className="w-full rounded-lg border border-[#1e3a52] object-cover max-h-64" />
                      </div>
                    )}
                    <footer className="mt-3 text-xs text-[#64748b] flex items-center gap-4">
                      <span>❤️ {post._count?.likes ?? 0}</span>
                      <span>💬 {post._count?.comments ?? 0}</span>
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}