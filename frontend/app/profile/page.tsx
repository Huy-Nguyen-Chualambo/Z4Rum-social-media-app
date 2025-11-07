"use client";
import React, { useEffect } from "react";
import RequireAuth from "../_components/RequireAuth";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      router.replace(`/users/${user.id}`);
    }
  }, [user, router]);

  return (
    <div>
      <RequireAuth />
      <section className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-6">
        <h1 className="text-white text-2xl font-bold mb-2">Profile</h1>
        <p className="text-[#cbd5e1]">Đang chuyển đến hồ sơ của bạn...</p>
      </section>
    </div>
  );
}


