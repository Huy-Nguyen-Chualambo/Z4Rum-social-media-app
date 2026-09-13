import { announcements } from "@/lib/constants/announcements";

export default function RightRail() {
  return (
    <aside className="hidden lg:block sticky top-14 h-[calc(100dvh-56px)] overflow-y-auto px-5 py-5">
      <div className="flex items-baseline justify-between border-b border-neutral-800 pb-3">
        <h2 className="text-sm font-bold">Thông báo từ Bảnh</h2>
        <span className="font-mono text-[10px] text-neutral-500">GHIM</span>
      </div>
      <div className="divide-y divide-neutral-800">
        {announcements.map((item, index) => (
          <section key={item.title} className="py-4">
            <span className="font-mono text-[10px] text-neutral-500">0{index + 1} / BẢNG TIN</span>
            <h3 className="mt-1 mb-2 text-[13px] font-bold leading-5">{item.title}</h3>
            <p className="text-xs leading-5 text-neutral-400">{item.description}</p>
            <a href={item.link} target={item.link.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="mt-2 inline-block text-xs text-blue-500 hover:underline">{item.linkText} ↗</a>
          </section>
        ))}
      </div>
      <p className="border-t border-neutral-800 pt-4 text-[11px] leading-5 text-neutral-500">Z4rum · Mạng xã hội của Bảnh.<br />Ít màu mè. Nhiều chuyện để kể.</p>
    </aside>
  );
}
