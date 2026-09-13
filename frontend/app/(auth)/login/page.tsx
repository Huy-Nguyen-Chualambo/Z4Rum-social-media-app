"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useToast } from "@/lib/ui/toast";
import { GoogleLoginButton } from "../GoogleLoginButton";

const getAuthErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || fallback;
  }
  return fallback;
};

export default function LoginPage() {
  const router = useRouter();
  const { login, googleLogin, token } = useAuthStore();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      router.replace("/home");
    }
  }, [token, router]);

  const [error, setError] = useState<string | null>(null);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await googleLogin(credential);
      push("Đăng nhập Google thành công", "success");
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err, "Đăng nhập Google thất bại");
      setError(message);
      push(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [googleLogin, push]);

  const handleGoogleError = useCallback((message: string) => {
    setError(message);
    push(message, "error");
  }, [push]);

  return (
    <div className="bg-[#141414] border border-[#303030] rounded-sm p-6">
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
            setIsLoading(true);
            await login(email, password);
            push("Đăng nhập thành công", "success");
          } catch (err: unknown) {
            const message = getAuthErrorMessage(err, "Đăng nhập thất bại");
            setError(message);
            push(message, "error");
          } finally {
            setIsLoading(false);
          }
        }}
      >
        <input className="w-full bg-transparent border border-[#303030] rounded-lg px-3 py-2 text-[#dedede] placeholder:text-[#858585]" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full bg-transparent border border-[#303030] rounded-lg px-3 py-2 text-[#dedede] placeholder:text-[#858585]" placeholder="Mật khẩu" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="w-full py-2 rounded-lg bg-blue-500 text-white font-semibold">Đăng nhập</button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs uppercase text-[#969696]">
        <div className="h-px flex-1 bg-[#303030]" />
        hoặc
        <div className="h-px flex-1 bg-[#303030]" />
      </div>
      <GoogleLoginButton onCredential={handleGoogleCredential} onError={handleGoogleError} />
      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      <p className="mt-4 text-sm text-[#a3a3a3]">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="text-[#3B82F6] hover:underline">
          Đăng ký ngay
        </Link>
      </p>
      <Link href="/" className="text-[#a3a3a3] hover:text-white underline transition-colors duration-300 flex items-center gap-2">
        Quay về trang chính
      </Link>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60  z-[999] flex flex-col items-center justify-center">
          <div className="bg-[#141414] border border-[#303030] p-8 rounded-sm  flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
            <div className="text-white font-medium text-lg animate-pulse">Đang kết nối tới máy chủ...</div>
            <p className="text-[#969696] text-sm italic">&quot;Vui lòng đợi giây lát&quot;</p>
          </div>
        </div>
      )}
    </div>
  );
}
