import { Film, BookOpen, Facebook } from "lucide-react";
import React from "react";

export interface Announcement {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  linkText: string;
}

export const announcements: Announcement[] = [
  {
    icon: <Film size={20} className="text-blue-400" />,
    title: "Chuyển trang Xem Phim",
    description: "Chuyển xem phim sang web riêng do dev lỏ không scale được , cả nhà thông cảm nha 😢",
    link: "https://z4phim.vercel.app",
    linkText: "z4phim.vercel.app"
  },
  {
    icon: <BookOpen size={20} className="text-purple-400" />,
    title: "Ra mắt Z4Truyen",
    description: "Nơi đọc truyện cực chill, kho truyện khổng lồ đang chờ bạn khám phá!",
    link: "https://z4truyen.vercel.app",
    linkText: "z4truyen.vercel.app"
  },
  {
    icon: <Facebook size={20} className="text-blue-600" />,
    title: "Liên hệ Admin",
    description: "Nếu có vấn đề gì hoặc muốn đóng góp ý kiến, cứ réo tên Assmin Huy Nguyễn nha.",
    link: "https://www.facebook.com/huynguyen.122011",
    linkText: "Facebook của Bảnh"
  }
];
