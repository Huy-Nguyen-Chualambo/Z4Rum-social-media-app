"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Cpu, Loader2 } from "lucide-react";
import { z4chatAi, type ModelsResponse } from "@/lib/api/z4chatApi";
import Modal from "./Modal";
import { GhostButton } from "./FormBits";

/**
 * Which provider/model answers for this session.
 *
 * Only providers with a key configured are offered - the list comes from
 * /api/z4chat/models, which reads env server-side. A provider whose key is
 * missing is still listed, greyed out, so it is obvious what pasting a key would
 * unlock.
 */
export default function ModelPicker({
  open,
  provider,
  model,
  onClose,
  onPick,
}: {
  open: boolean;
  provider: string;
  model: string;
  onClose: () => void;
  onPick: (provider: string, model: string) => void;
}) {
  const [data, setData] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || data) return;
    setLoading(true);
    z4chatAi
      .models()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Không đọc được danh sách model"))
      .finally(() => setLoading(false));
  }, [open, data]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chọn AI trả lời"
      maxWidth="max-w-lg"
      footer={<GhostButton onClick={onClose}>Đóng</GhostButton>}
    >
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-[#94a3b8] text-sm">
          <Loader2 size={16} className="animate-spin" />
          Đang tìm provider khả dụng…
        </div>
      )}

      {error && <p className="text-[#f87171] text-sm text-center py-6">{error}</p>}

      {data && !data.ready && (
        <div className="flex items-start gap-3 bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-2xl p-4 mb-5">
          <AlertTriangle size={18} className="text-[#fbbf24] shrink-0 mt-0.5" />
          <p className="text-[#fcd34d] text-sm leading-relaxed">
            Chưa có API key nào. Thêm <code className="text-[#fef3c7]">OPENROUTER_API_KEY</code> (hoặc GEMINI / GROQ /
            DEEPSEEK / OPENAI) vào <code className="text-[#fef3c7]">frontend/.env.local</code> rồi khởi động lại là dùng
            được ngay.
          </p>
        </div>
      )}

      {data?.providers.map((entry) => (
        <div key={entry.id} className="mb-5 last:mb-0">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={14} className={entry.available ? "text-[#60A5FA]" : "text-[#475569]"} />
            <span className={`text-sm font-bold ${entry.available ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
              {entry.label}
            </span>
            {!entry.available && <span className="text-[#475569] text-xs">chưa có key</span>}
          </div>

          <div className="space-y-1.5">
            {entry.models.map((item) => {
              const active = entry.id === provider && item.id === model;
              return (
                <button
                  key={item.id}
                  disabled={!entry.available}
                  onClick={() => {
                    onPick(entry.id, item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                    active
                      ? "border-[#3B82F6]/50 bg-gradient-to-r from-[#3B82F6]/15 to-[#8B5CF6]/15"
                      : "border-[#1e3a52] hover:bg-[#1e293b]/60"
                  } disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                >
                  <span className="min-w-0">
                    <span className="block text-[#e2e8f0] text-sm font-semibold truncate">{item.label}</span>
                    <span className="block text-[#475569] text-[11px] truncate">{item.id}</span>
                  </span>
                  {active && <Check size={16} className="text-[#60A5FA] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {data && (
        <p className="text-[#64748b] text-xs mt-4 leading-relaxed">
          Nếu provider bạn chọn lỗi hoặc hết hạn mức, Z4chat tự thử provider khác đang có key thay vì báo lỗi.
        </p>
      )}
    </Modal>
  );
}
