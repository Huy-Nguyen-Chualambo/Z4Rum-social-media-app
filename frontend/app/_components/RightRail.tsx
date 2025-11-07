"use client";
import { Search, Sparkles, TrendingUp } from "lucide-react";

const suggestions = [
  { name: "John Doe", handle: "@johndoe", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { name: "Jane Smith", handle: "@janesmith", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  { name: "Tom Anderson", handle: "@tornandy", avatar: "https://randomuser.me/api/portraits/men/76.jpg" },
];

export default function RightRail() {
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
          <h4 className="text-white font-semibold text-sm">What's trending</h4>
        </div>
        <ul className="flex flex-col gap-3">
          <li className="hover:bg-[#1e293b] p-3 rounded-lg transition-colors cursor-pointer group">
            <div className="text-[#60A5FA] text-sm font-medium group-hover:text-[#93C5FD]">#tech</div>
            <div className="text-[#64748b] text-xs mt-1">12.4k posts</div>
          </li>
          <li className="hover:bg-[#1e293b] p-3 rounded-lg transition-colors cursor-pointer group">
            <div className="text-[#60A5FA] text-sm font-medium group-hover:text-[#93C5FD]">#music</div>
            <div className="text-[#64748b] text-xs mt-1">8.9k posts</div>
          </li>
          <li className="hover:bg-[#1e293b] p-3 rounded-lg transition-colors cursor-pointer group">
            <div className="text-[#60A5FA] text-sm font-medium group-hover:text-[#93C5FD]">#photography</div>
            <div className="text-[#64748b] text-xs mt-1">15.2k posts</div>
          </li>
        </ul>
      </div>
    </aside>
  );
}


