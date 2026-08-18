import { Bell, ExternalLink, Info } from "lucide-react";
import { announcements, type Announcement } from "@/lib/constants/announcements";

export default function RightRail() {
  return (
    <aside className="hidden lg:block w-80 min-w-[20rem] p-6 h-screen sticky top-0 overflow-y-auto custom-scrollbar">
      {/* Announcements Section */}
      <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="flex items-center gap-3 mb-8 relative z-10">
          <div className="bg-blue-500/20 p-2 rounded-xl">
            <Bell size={24} className="text-blue-400 animate-bounce" />
          </div>
          <h4 className="text-white font-black text-xl tracking-tight">Thông Báo Từ Bảnh</h4>
        </div>

        <div className="flex flex-col gap-8 relative z-10">
          {announcements.map((item: Announcement, index: number) => (
            <div key={index} className="flex flex-col gap-3 group">
              <div className="flex gap-4 items-start">
                <div className="p-2.5 rounded-xl bg-[#1e293b] border border-[#334155] group-hover:border-blue-500/50 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/10 shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h5 className="text-[#e2e8f0] font-bold text-[15px] mb-1.5 group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h5>
                  <p className="text-[#94a3b8] text-[13px] leading-relaxed mb-3">
                    {item.description}
                  </p>

                  <a
                    href={item.link}
                    // Internal links (e.g. /z4chat) stay in this tab.
                    target={item.link.startsWith("/") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/20"
                  >
                    {item.linkText}
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/*<div className="mt-10 pt-6 border-t border-[#1e3a52] flex items-center justify-center gap-2">
          <Info size={14} className="text-[#475569]" />
          <p className="text-[#64748b] text-[11px] font-medium tracking-widest uppercase">
            Z4rum Dev Team
          </p>
        </div>*/}
      </div>

      {/* Footer minimal info if needed can go here 
      <div className="mt-8 px-4">
        <p className="text-[#475569] text-[10px] text-center leading-relaxed">
          Z4Rum - Mạng xã hội của những người đẹp trai khoai to.
          <br />
          © 2026 Developed by Huy Nguyễn & Bảnh.
        </p>
      </div>*/}
    </aside>
  );
}
