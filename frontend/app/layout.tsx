import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./_components/Sidebar";
import RightRail from "./_components/RightRail";
import BottomNav from "./_components/BottomNav";
import Providers from "./providers";

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
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[18rem_minmax(0,1fr)_20rem]">
              <div className="hidden md:block"><Sidebar /></div>
              <main className="min-h-screen border-l md:border-l border-[#1e293b] px-4 sm:px-5 md:px-6 py-4 md:py-6 max-w-2xl md:max-w-none w-full mx-auto">
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
