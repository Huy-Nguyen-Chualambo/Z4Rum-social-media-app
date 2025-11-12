"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useToast } from "@/lib/ui/toast";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const { push } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // Thêm state cho nhập lại mật khẩu
  const [gender, setGender] = useState<"male" | "female">("male");

  const [error, setError] = useState<string | null>(null);
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
            await register(username, email, password, gender);
            push("Tạo tài khoản thành công", "success");
            router.replace("/home");
          } catch (err: any) {
            setError(err?.response?.data?.error || "Đăng ký thất bại");
            push(err?.response?.data?.error || "Đăng ký thất bại", "error");
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
      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      <p className="mt-4 text-sm text-[#94a3b8]">
        Đã có tài khoản?{" "}
        <a href="/login" className="text-[#3B82F6] hover:underline">
          Đăng nhập ngay
        </a>
      </p>
        <a href="/" className="text-[#94a3b8] hover:text-white underline transition-colors duration-300 flex items-center gap-2">
          Quay về trang chính 
        </a>
    </div>
  );
}
