"use client";
import { X } from "lucide-react";
import { useEffect } from "react";

/**
 * Modal shell for the Z4chat forms. Same look as PostModal, but the body scrolls
 * on its own - the character form is tall enough to need it on a phone.
 */
export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidth = "max-w-2xl",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-3xl w-full ${maxWidth} relative z-[101] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]`}
      >
        <div className="flex items-center justify-between px-5 sm:px-7 py-5 border-b border-[#1e3a52] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-1.5 h-6 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full shrink-0" />
            <h2 className="text-white text-lg font-bold tracking-tight truncate">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-white transition-colors bg-[#1e293b]/50 p-2 rounded-xl border border-[#334155] shrink-0"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-5 sm:px-7 py-4 border-t border-[#1e3a52] shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
