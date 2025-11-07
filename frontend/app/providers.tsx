"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { ToastProvider } from "@/lib/ui/toast";
import { useSocketStore } from "@/lib/store/useSocketStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const { token, loadMe } = useAuthStore();
  const { connect, disconnect } = useSocketStore();
  useEffect(() => {
    if (token) loadMe();
  }, [token, loadMe]);
  useEffect(() => {
    if (token) {
      connect(token);
      return () => disconnect();
    }
  }, [token, connect, disconnect]);
  return <ToastProvider>{children}</ToastProvider>;
}


