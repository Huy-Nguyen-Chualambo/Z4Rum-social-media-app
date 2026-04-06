import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./_components/Sidebar";
import RightRail from "./_components/RightRail";
import { announcements, type Announcement } from "@/lib/constants/announcements";
import BottomNav from "./_components/BottomNav";
import Navbar from "./_components/Navbar";
import Providers from "./providers";
import { ExternalLink, Bell } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Z4rum",
  description: "Z4rum Social App",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <div className="min-h-screen bg-[#0a0f1e] font-sans text-[#F1F5F9] pb-14 md:pb-0">
            <Navbar />
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[18rem_minmax(0,1fr)_20rem] md:pt-0">
              <div className="hidden md:block"><Sidebar /></div>
              
              <main className="min-h-screen border-l md:border-l border-[#1e293b] px-4 sm:px-5 md:px-6 py-4 md:py-6 max-w-2xl md:max-w-none w-full mx-auto">
                {/* Mobile Announcements */}
                <div className="lg:hidden mb-10 mt-2 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-500/20 p-2 rounded-xl">
                      <Bell size={20} className="text-blue-400 animate-pulse" />
                    </div>
                    <h3 className="text-white font-black text-lg tracking-tight">Thông báo mới</h3>
                  </div>
                  
                  <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-4 px-1 -mx-1">
                    {announcements.map((item: Announcement, index: number) => (
                      <a 
                        key={index}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-none w-[85%] sm:w-[320px] snap-center flex items-center gap-4 bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] p-5 rounded-3xl active:scale-95 transition-all shadow-lg hover:shadow-blue-500/5"
                      >
                        <div className="p-3 rounded-2xl bg-[#1e293b] border border-[#334155] shrink-0 text-blue-400 group-hover:scale-110 transition-transform">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <h4 className="text-[#e2e8f0] font-black text-sm mb-1.5 tracking-tight">{item.title}</h4>
                          <p className="text-[#94a3b8] text-[13px] leading-[1.5] break-words">
                            {item.description}
                          </p>
                        </div>
                        <div className="bg-blue-500/10 p-1.5 rounded-lg shrink-0 self-start mt-1">
                          <ExternalLink size={14} className="text-blue-400 opacity-60" />
                        </div>
                      </a>
                    ))}
                  </div>
                  
                  {/* Subtle Indicator */}
                  <div className="flex justify-center gap-1.5 mt-[-2px] mb-4">
                    <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-[#1e293b] to-transparent"></div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-[#1e293b] to-transparent w-full"></div>
                </div>

                {children}
              </main>
              <RightRail />
            </div>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
