"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: number; message: string; type?: "success" | "error" | "info" };

const ToastCtx = createContext<{ push: (msg: string, type?: Toast["type"]) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-16 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-2 rounded-lg shadow border ${
              t.type === "error" ? "bg-red-500/10 border-red-500 text-red-200" : t.type === "success" ? "bg-green-500/10 border-green-500 text-green-200" : "bg-[#1e293b] border-[#334155] text-[#cbd5e1]"
            }`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}


