"use client";
import { Search, Sparkles, TrendingUp, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { voteApi, VoteTopic } from "@/lib/api/voteApi";
import Link from "next/link";

const suggestions = [
  { name: "John Doe", handle: "@johndoe", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { name: "Jane Smith", handle: "@janesmith", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  { name: "Tom Anderson", handle: "@tornandy", avatar: "https://randomuser.me/api/portraits/men/76.jpg" },
];

export default function RightRail() {
  const [trendingTopics, setTrendingTopics] = useState<VoteTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const data = await voteApi.trending(5);
        setTrendingTopics(data);
      } catch (error) {
        console.error("Failed to load trending topics:", error);
      } finally {
        setLoading(false);
      }
    };
    loadTrending();
    // Refresh every 30 seconds
    const interval = setInterval(loadTrending, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTotalVotes = (topic: VoteTopic) => {
    return topic.options.reduce((sum, opt) => sum + (opt._count?.votes || 0), 0);
  };

  return (
    <aside className="hidden lg:block w-80 min-w-[20rem] p-6 h-screen sticky top-0 overflow-y-auto">
      <div className="mb-6">
        <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <Search size={18} className="text-[#64748b]" />
            <input placeholder="Search Z4rum..." className="bg-transparent outline-none text-[#cbd5e1] text-sm w-full placeholder:text-[#475569]" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] p-5 rounded-2xl mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-[#60A5FA]" />
          <h4 className="text-white font-semibold text-sm">People you might vibe with</h4>
        </div>
        <div className="flex flex-col gap-4">
          {suggestions.map((s) => (
            <div key={s.handle} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <img src={s.avatar} className="w-11 h-11 rounded-full object-cover ring-2 ring-[#1e3a52] group-hover:ring-[#3B82F6] transition-all" alt="suggestion" />
                <div>
                  <div className="text-white text-sm font-medium hover:underline cursor-pointer">{s.name}</div>
                  <div className="text-[#64748b] text-xs">{s.handle}</div>
                </div>
              </div>
              <button className="px-4 py-1.5 bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white text-xs font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-105">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-[#60A5FA]" />
          <h4 className="text-white font-semibold text-sm">Trending Votes</h4>
        </div>
        {loading ? (
          <div className="text-[#64748b] text-sm py-4 text-center">Đang tải...</div>
        ) : trendingTopics.length === 0 ? (
          <div className="text-[#64748b] text-sm py-4 text-center">Chưa có topic nào</div>
        ) : (
          <ul className="flex flex-col gap-3">
            {trendingTopics.map((topic) => {
              const totalVotes = getTotalVotes(topic);
              return (
                <Link key={topic.id} href="/vote">
                  <li className="hover:bg-[#1e293b] p-3 rounded-lg transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[#60A5FA] text-sm font-medium group-hover:text-[#93C5FD] line-clamp-2">
                          {topic.title}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-[#64748b] text-xs">
                            <BarChart3 size={12} />
                            <span>{totalVotes} votes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </Link>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}


