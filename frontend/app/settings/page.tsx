"use client";
import React from "react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#101010] font-sans text-[#ededed]">
      <div className="max-w-[1400px] mx-auto grid grid-cols-[1fr] px-6 py-8">
        <section className="bg-[#141414] border border-[#303030] rounded-sm p-6">
          <h1 className="text-white text-2xl font-bold mb-4">Settings</h1>
          <p className="text-[#dedede]">Tuỳ chỉnh tài khoản và cài đặt ứng dụng.</p>
        </section>
      </div>
    </div>
  );
}


