"use client";
import { useCallback, useState } from "react";
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

export default function RegisterPage() {
  const router = useRouter();
  const { register, googleLogin } = useAuthStore();
  const { push } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // Thêm state cho nhập lại mật khẩu
  const [gender, setGender] = useState<"male" | "female">("male");
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await googleLogin(credential, gender);
      push("Đăng nhập Google thành công", "success");
      router.replace("/home");
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err, "Đăng nhập Google thất bại");
      setError(message);
      push(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [gender, googleLogin, push, router]);

  const handleGoogleError = useCallback((message: string) => {
    setError(message);
    push(message, "error");
  }, [push]);

  return (
    <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-6">
      <h1 className="text-white text-2xl font-semibold mb-4">Tạo tài khoản</h1>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!username.trim()) {
            setError("Vui lòng nhập username");
            return;
          }
          if (!email.includes("@")) {
            setError("Email không hợp lệ");
            return;
          }
          if (password.length < 6) {
            setError("Mật khẩu tối thiểu 6 ký tự");
            return;
          }
          if (password !== confirmPassword) {
            setError("Mật khẩu nhập lại không khớp");
            return;
          }
          try {
            setError(null);
            setIsLoading(true);
            await register(username, email, password, gender);
            push("Tạo tài khoản thành công", "success");
            router.replace("/home");
          } catch (err: unknown) {
            const message = getAuthErrorMessage(err, "Đăng ký thất bại");
            setError(message);
            push(message, "error");
          } finally {
            setIsLoading(false);
          }
        }}
      >
        <input className="w-full bg-transparent border border-[#1e3a52] rounded-lg px-3 py-2 text-[#cbd5e1] placeholder:text-[#475569]" placeholder="Tên người dùng" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="w-full bg-transparent border border-[#1e3a52] rounded-lg px-3 py-2 text-[#cbd5e1] placeholder:text-[#475569]" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full bg-transparent border border-[#1e3a52] rounded-lg px-3 py-2 text-[#cbd5e1] placeholder:text-[#475569]" type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input className="w-full bg-transparent border border-[#1e3a52] rounded-lg px-3 py-2 text-[#cbd5e1] placeholder:text-[#475569]" type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <div className="flex items-center gap-6 text-[#cbd5e1]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="gender" checked={gender === "male"} onChange={() => setGender("male")} /> Nam
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="gender" checked={gender === "female"} onChange={() => setGender("female")} /> Nữ
          </label>
        </div>
        <button type="submit" className="w-full py-2 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold">Đăng ký</button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs uppercase text-[#64748b]">
        <div className="h-px flex-1 bg-[#1e3a52]" />
        hoặc
        <div className="h-px flex-1 bg-[#1e3a52]" />
      </div>
      <GoogleLoginButton text="signup_with" onCredential={handleGoogleCredential} onError={handleGoogleError} />
      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      <p className="mt-4 text-sm text-[#94a3b8]">
        Đã có tài khoản?{" "}
        <Link href="/login" className="text-[#3B82F6] hover:underline">
          Đăng nhập ngay
        </Link>
      </p>
      <Link href="/" className="text-[#94a3b8] hover:text-white underline transition-colors duration-300 flex items-center gap-2">
        Quay về trang chính
      </Link>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex flex-col items-center justify-center">
          <div className="bg-[#0f1e30] border border-[#1e3a52] p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
            <div className="text-white font-medium text-lg animate-pulse">Đang thiết lập tài khoản...</div>
            <p className="text-[#64748b] text-sm italic">&quot;Chờ xíu nhé, sắp xong then!&quot;</p>
          </div>
        </div>
      )}
    </div>
  );
}
