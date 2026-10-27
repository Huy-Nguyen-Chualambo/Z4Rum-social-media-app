"use client";
import { useEffect, useRef, type ReactNode } from "react";
export default function WorldDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0],
          last = controls.at(-1);
        if (!first || !last) return;
        if (
          (event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last) ||
          document.activeElement === event.currentTarget
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }}
      aria-label={title}
      className="m-auto max-h-[85dvh] w-[min(620px,calc(100%-24px))] overflow-y-auto rounded-2xl border border-neutral-700 bg-[#191b18] p-4 text-neutral-100 shadow-2xl backdrop:bg-black/65 sm:p-6"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <button
          autoFocus
          onClick={onClose}
          className="min-h-11 rounded-lg border border-neutral-600 px-3 text-sm"
          aria-label="Đóng cửa sổ"
        >
          Đóng ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
