import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "./_components/Sidebar";
import RightRail from "./_components/RightRail";
import { announcements, type Announcement } from "@/lib/constants/announcements";
import BottomNav from "./_components/BottomNav";
import MobileViewport from "./_components/MobileViewport";
import Navbar from "./_components/Navbar";
import Providers from "./providers";
import Z4chatWatcher from "./_components/Z4chatWatcher";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";


export const metadata: Metadata = {
  applicationName: "Z4rum",
  appleWebApp: {
    capable: true,
    title: "Z4rum",
    statusBarStyle: "default",
  },
  title: "Z4rum",
  description: "Z4rum Social App",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "500x500" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#101010",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <Providers>
          <Z4chatWatcher />
          <MobileViewport />
          <div className="min-h-screen bg-[#101010] font-sans text-[#ededed] app-shell">
            <Navbar />
            <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_280px] md:pt-0">
              <div className="hidden md:block"><Sidebar /></div>

              <main id="main-content" className="min-w-0 min-h-screen md:border-x border-[#292929] w-full">
                <details className="lg:hidden border-b border-[#292929] px-4 py-2 text-xs text-neutral-400">
                  <summary className="cursor-pointer font-semibold text-neutral-200">Thông báo từ Bảnh</summary>
                  <div className="divide-y divide-neutral-800">
                    {announcements.map((item: Announcement) => (
                      <a key={item.title} href={item.link} target={item.link.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="block py-3 hover:text-blue-500">{item.title}</a>
                    ))}
                  </div>
                </details>

                {children}
              </main>
              <RightRail />
            </div>
            <BottomNav />
          </div>
        </Providers>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
