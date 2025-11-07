import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3B82F6] via-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30 mb-6">Z</div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Welcome to Z4rum</h1>
      <p className="text-[#94a3b8] max-w-xl mb-8">A modern social space to explore, match and message in real-time.</p>
      <div className="flex items-center gap-3">
        <Link href="/login" className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold">Sign in</Link>
        <Link href="/register" className="px-5 py-2 rounded-lg border border-[#1e3a52] text-[#cbd5e1] hover:bg-[#1e293b]">Sign up</Link>
    </div>
    <Link href="/home" className="px-5 py-2 rounded-lg border border-transparent text-[#94a3b8] text-decoration: underline hover:text-white">Preview Home</Link>
      </div>
  );
}
