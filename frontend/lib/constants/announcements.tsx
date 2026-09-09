import { Film, Sparkles, Facebook, KeyRound } from "lucide-react";
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
    icon: <KeyRound size={20} className="text-blue-400" />,
    title: "Bảnh sẽ chặn 1 số từ khoá khi đăng bài, và 1 số thay đổi khác nữa",
    description: "Do một số thành phần rác đăng bài linh tinh nên bảnh sẽ chặn 1 số từ không phù hợp, bạn là con người, bảnh cũng là con người nói thế tự hiểu , cả nhà thông cảm nha 😢",
    link: "https://www.tiktok.com/@z4rum2",
    linkText: "Kênh tiktok của Bảnh"
  },
  {
    icon: <Sparkles size={20} className="text-purple-400" />,
    title: "Bảnh ra mắt bản demo Chat role-play cực hay",
    description: "Nơi bạn có thể tạo cốt truyện và nhân vật của riêng mình, trải nghiệm cảm giác như đang sống trong chính câu chuyện của bạn!",
    link: "/z4chat",
    linkText: "Vào Z4chat ngay"
  },
  {
    icon: <Facebook size={20} className="text-blue-600" />,
    title: "Liên hệ Admin",
    description: "Nếu có vấn đề gì hoặc muốn đóng góp ý kiến, cứ réo tên Assmin Huy Nguyễn nha.",
    link: "https://www.facebook.com/huynguyen.122011",
    linkText: "Facebook của Bảnh"
  }
];
