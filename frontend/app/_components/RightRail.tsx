"use client";
import { Search, BookOpen, PenSquare, MessageCircle, Heart, UserCircle, Star } from "lucide-react";

export default function RightRail() {
  const guideItems = [
    {
      icon: <PenSquare size={20} className="text-[#60A5FA]" />,
      title: "Bài viết",
      description: "Hình ảnh trên bài viết có thể không được hiển thị hết, bạn có thể mở bài viết để xem toàn bộ hình ảnh."
    },
    {
      icon: <Star size={20} className="text-[#F472B6]" />,
      title: "Hiển thị",
      description: "Thường thì các phản hồi của bạn sẽ không được hiển thị ngay lập tức, nhưng chúng sẽ xuất hiện sau khi bạn tải lại trang."
    },
    {
      icon: <MessageCircle size={20} className="text-[#34D399]" />,
      title: "Ghép đôi",
      description: "Thời gian ghép có thể khá lâu do lượng user không nhiều."
    },
    {
      icon: <UserCircle size={20} className="text-[#A78BFA]" />,
      title: "Trò chuyện",
      description: "Bạn có thể trò chuyện với người khác thông qua truy cập vào trang cá nhân của họ."
    }
  ];

  return (
    <aside className="hidden lg:block w-80 min-w-[20rem] p-6 h-screen sticky top-0 overflow-y-auto">
      {/* Search Bar 
      <div className="mb-6">
        <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <Search size={18} className="text-[#64748b]" />
            <input
              placeholder="Tìm kiếm..."
              className="bg-transparent outline-none text-[#cbd5e1] text-sm w-full placeholder:text-[#475569]"
            />
          </div>
        </div>
      </div>*/}

      {/* Guide Section */}
      <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen size={24} className="text-[#60A5FA]" />
          <h4 className="text-white font-bold text-lg">Hướng dẫn Newbie</h4>
        </div>

        <div className="flex flex-col gap-6">
          {guideItems.map((item, index) => (
            <div key={index} className="flex gap-4 items-start group">
              <div className="p-2 rounded-lg bg-[#1e293b] border border-[#334155] group-hover:border-[#60A5FA] transition-colors shrink-0">
                {item.icon}
              </div>
              <div>
                <h5 className="text-[#e2e8f0] font-semibold text-sm mb-1 group-hover:text-[#60A5FA] transition-colors">
                  {item.title}
                </h5>
                <p className="text-[#94a3b8] text-xs leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-[#1e3a52]">
          <p className="text-[#64748b] text-xs text-center italic">
            "Z4rum dev team"
          </p>
        </div>
      </div>
    </aside>
  );
}


