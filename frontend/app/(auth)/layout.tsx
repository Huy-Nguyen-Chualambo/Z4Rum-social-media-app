export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#101010] text-[#ededed] flex items-center justify-center px-4">
      <div className="w-full max-w-sm -mt-40">{children}</div>
    </div>
  );
}


