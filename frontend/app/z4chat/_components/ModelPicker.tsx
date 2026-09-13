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
        <div className="flex items-center justify-center gap-2 py-8 text-[#a3a3a3] text-sm">
          <Loader2 size={16} className="animate-spin" />
          Đang tìm provider khả dụng…
        </div>
      )}

      {error && <p className="text-[#f87171] text-sm text-center py-6">{error}</p>}

      {data && !data.ready && (
        <div className="flex items-start gap-3 bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-sm p-4 mb-5">
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
            <Cpu size={14} className={entry.available ? "text-[#3B82F6]" : "text-[#858585]"} />
            <span className={`text-sm font-bold ${entry.available ? "text-[#dedede]" : "text-[#858585]"}`}>
              {entry.label}
            </span>
            {!entry.available && <span className="text-[#858585] text-xs">chưa có key</span>}
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
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-sm border text-left transition-all ${
                    active
                      ? "border-[#3B82F6]/50 bg-blue-500"
                      : "border-[#303030] hover:bg-[#292929]/60"
                  } disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                >
                  <span className="min-w-0">
                    <span className="block text-[#ededed] text-sm font-semibold truncate">{item.label}</span>
                    <span className="block text-[#858585] text-[11px] truncate">{item.id}</span>
                  </span>
                  {active && <Check size={16} className="text-[#3B82F6] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {data && (
        <p className="text-[#969696] text-xs mt-4 leading-relaxed">
          Nếu provider bạn chọn lỗi hoặc hết hạn mức, Z4chat tự thử provider khác đang có key thay vì báo lỗi.
        </p>
      )}
    </Modal>
  );
}
