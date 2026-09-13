import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="px-5 py-8 sm:px-8">
      <p className="text-xs font-mono text-blue-500">CHÀO MỪNG ĐẾN VỚI Z4RUM</p>
      <h1 className="mt-4 text-3xl font-black tracking-tight">Bảnh đây. Anh em đâu rồi?</h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-neutral-400">Một góc mạng để kể chuyện, hóng hớt, thả meme và gặp những người lạ mà quen. Kéo ghế vào ngồi cùng anh em.</p>
      <div className="my-6 flex flex-wrap gap-3 text-sm">
        <Link href="/login" className="rounded-sm bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-500">Đăng nhập</Link>
        <Link href="/register" className="rounded-sm border border-neutral-700 px-4 py-2 hover:bg-neutral-900">Gia nhập cùng Bảnh</Link>
      </div>
      <div className="border-t border-neutral-800">
        {[['/home', '01', 'Chuyện anh em', 'Bài mới, ảnh mới, chuyện không mới nhưng vẫn vui.'], ['/match', '02', 'Chat với người lạ', 'Một lời chào, biết đâu lại hợp cạ.'], ['/vote', '03', 'Bình chọn & thảo luận', 'Mỗi người một ý. Vào góp tiếng nào.']].map(([href, number, title, description]) => (
          <Link key={href} href={href} className="flex gap-4 border-b border-neutral-800 py-5 hover:bg-neutral-900">
            <span className="pt-1 font-mono text-xs text-neutral-500">{number}</span>
            <div><h2 className="text-base font-bold">{title} <span className="text-blue-500">→</span></h2><p className="mt-1 text-sm text-neutral-400">{description}</p></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
