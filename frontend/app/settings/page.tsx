"use client";
import React from "react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] font-sans text-[#F1F5F9]">
      <div className="max-w-[1400px] mx-auto grid grid-cols-[1fr] px-6 py-8">
        <section className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-6">
          <h1 className="text-white text-2xl font-bold mb-4">Settings</h1>
          <p className="text-[#cbd5e1]">Tuỳ chỉnh tài khoản và cài đặt ứng dụng.</p>
        </section>
      </div>
    </div>
  );
}


