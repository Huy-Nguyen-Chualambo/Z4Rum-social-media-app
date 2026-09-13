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
    <div className="min-h-screen bg-[#101010] font-sans text-[#ededed]">
      <RequireAuth />
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <section className="bg-[#141414] border border-[#303030] rounded-sm p-6">
          <h1 className="text-white text-2xl font-bold mb-2">Khám phá</h1>
          <p className="text-[#dedede] text-sm mb-5">Tìm kiếm bạn bè và bài viết thú vị từ cộng đồng.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#969696]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nhập tên người dùng hoặc nội dung bài viết..."
                className="w-full bg-[#181818] border border-[#303030] rounded-sm py-3 pl-10 pr-3 text-sm text-[#dedede] outline-none focus:border-[#3B82F6] transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-3 text-sm font-semibold rounded-sm bg-blue-500 text-white   transition-all"
              >
                Tìm kiếm
              </button>
              {hasQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-3 text-sm font-semibold rounded-sm border border-[#303030] text-[#dedede] hover:bg-[#1c1c1c] transition-colors"
                >
                  Xoá
                </button>
              )}
            </div>
          </form>
          {hasQuery && (
            <div className="mt-4 text-sm text-[#a3a3a3]">
              Kết quả cho <span className="text-white font-medium">"{submittedQuery}"</span>
            </div>
          )}
        </section>

        {!hasQuery ? (
          <section className="bg-[#141414] border border-[#303030] rounded-sm p-6 text-[#dedede] text-sm leading-relaxed">
            <p className="mb-2 text-white font-semibold">Gợi ý</p>
            <ul className="space-y-2 list-disc list-inside text-[#a3a3a3]">
              <li>Nhập tên người dùng để tìm bạn bè mới.</li>
              <li>Tìm kiếm theo chủ đề, cảm xúc hoặc sự kiện để xem bài viết liên quan.</li>
              <li>Sử dụng bộ lọc từ khóa ngắn gọn để có kết quả chính xác hơn.</li>
            </ul>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-[#141414] border border-[#303030] rounded-sm p-6">
              <header className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-sm bg-[#1c1c1c] text-[#3B82F6]">
                  <Users size={20} />
                </div>
                <h2 className="text-white text-lg font-semibold">Tài khoản</h2>
              </header>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-[#a3a3a3]">
                  <Loader2 size={16} className="animate-spin" /> Đang tìm kiếm tài khoản...
                </div>
              )}
              {!loading && userResults.length === 0 && (
                <div className="text-sm text-[#969696]">Không tìm thấy tài khoản phù hợp.</div>
              )}
              <div className="space-y-3">
                {userResults.map((user) => (
                  <Link
                    key={user.id}
                    href={`/users/${user.id}`}
                    className="flex items-center gap-3 rounded-sm border border-transparent hover:border-[#525252] hover:bg-[#141414] transition-all p-3"
                  >
                    <img
                      src={user.avatarUrl || fallbackAvatar}
                      alt={user.username}
                      className="w-12 h-12 rounded-full object-cover  "
                    />
                    <div>
                      <div className="text-white font-medium">{user.username}</div>
                      <div className="text-xs text-[#969696]">Xem hồ sơ</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="bg-[#141414] border border-[#303030] rounded-sm p-6">
              <header className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-sm bg-[#1c1c1c] text-[#3B82F6]">
                  <FileText size={20} />
                </div>
                <h2 className="text-white text-lg font-semibold">Bài viết</h2>
              </header>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-[#a3a3a3]">
                  <Loader2 size={16} className="animate-spin" /> Đang tìm kiếm bài viết...
                </div>
              )}
              {!loading && postResults.length === 0 && (
                <div className="text-sm text-[#969696]">Không tìm thấy bài viết phù hợp.</div>
              )}
              <div className="divide-y divide-neutral-800">
                {postResults.map((post) => (
                  <article
                    key={post.id}
                    onClick={() => router.push(`/users/${post.author.id}`)}
                    className="timeline-post cursor-pointer"
                  >
                    <header className="flex items-center gap-3 mb-3">
                      <Link href={`/users/${post.author.id}`} onClick={(e) => e.stopPropagation()}>
                        <img
                          src={post.author.avatarUrl || fallbackAvatar}
                          alt={post.author.username}
                          className="w-10 h-10 rounded-full object-cover  "
                        />
                      </Link>
                      <div>
                        <Link href={`/users/${post.author.id}`} onClick={(e) => e.stopPropagation()} className="text-white text-sm font-semibold hover:underline">
                          {post.author.username}
                        </Link>
                        <div className="text-xs text-[#969696]">{formatDateTime(post.createdAt)}</div>
                      </div>
                    </header>
                    <p className="text-sm text-[#dedede] leading-relaxed">{truncate(post.content)}</p>
                    {post.imageUrl && (
                      <div className="mt-3">
                        <img src={post.imageUrl} alt="post" className="w-full rounded-lg border border-[#303030] object-cover max-h-64" />
                      </div>
                    )}
                    <footer className="mt-3 text-xs text-[#969696] flex items-center gap-4">
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
