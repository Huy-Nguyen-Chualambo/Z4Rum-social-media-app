"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useToast } from "@/lib/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const { login, token, loadMe } = useAuthStore();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (token) {
      loadMe().then(() => router.replace("/home"));
    }
  }, [token, loadMe, router]);

  const [error, setError] = useState<string | null>(null);
  return (
    <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-6">
      <h1 className="text-white text-2xl font-semibold mb-4">Đăng nhập</h1>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!email.includes("@")) {
            setError("Email không hợp lệ");
            return;
          }
          if (password.length < 6) {
            setError("Mật khẩu tối thiểu 6 ký tự");
            return;
          }
          try {
            setError(null);
            await login(email, password);
            push("Đăng nhập thành công", "success");
          } catch (err: any) {
            setError(err?.response?.data?.error || "Đăng nhập thất bại");
            push(err?.response?.data?.error || "Đăng nhập thất bại", "error");
          }
        }}
      >
        <input className="w-full bg-transparent border border-[#1e3a52] rounded-lg px-3 py-2 text-[#cbd5e1] placeholder:text-[#475569]" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full bg-transparent border border-[#1e3a52] rounded-lg px-3 py-2 text-[#cbd5e1] placeholder:text-[#475569]" placeholder="Mật khẩu" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="w-full py-2 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold">Đăng nhập</button>
      </form>
      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      <p className="mt-4 text-sm text-[#94a3b8]">
        Chưa có tài khoản?{" "}
        <a href="/register" className="text-[#3B82F6] hover:underline">
          Đăng ký ngay
        </a>
        </p>
        <a href="/" className="text-[#94a3b8] hover:text-white underline transition-colors duration-300 flex items-center gap-2">
          Quay về trang chính
        </a>
    </div>
  );
}
