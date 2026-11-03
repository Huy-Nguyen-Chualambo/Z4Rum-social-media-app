"use client";
import { useState, useSyncExternalStore } from "react";
import { Smartphone, X } from "lucide-react";
import {
  canLockLandscape,
  enterImmersive,
  PHONE_PORTRAIT_QUERY,
  useMediaQuery,
} from "@/lib/world/immersive";
import styles from "./world-hud.module.css";

const STORAGE_KEY = "z4world-rotate-hint-dismissed";
const subscribeNever = () => () => {};
const wasDismissed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

/** Suggests landscape once. Portrait stays playable, so this never blocks the game. */
export default function RotateHint() {
  const portrait = useMediaQuery(PHONE_PORTRAIT_QUERY);
  const stored = useSyncExternalStore(subscribeNever, wasDismissed, () => true);
  const lockable = useSyncExternalStore(
    subscribeNever,
    canLockLandscape,
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);
  if (!portrait || stored || dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Without storage the hint simply returns on the next visit.
    }
  };
  return (
    <div
      role="status"
      className={`${styles.panel} flex items-center gap-2 py-1.5 pl-3 pr-1.5 text-xs`}
    >
      <Smartphone size={16} className="shrink-0 rotate-90" aria-hidden />
      <span className="min-w-0 flex-1">Xoay ngang để chơi rộng hơn</span>
      {lockable && (
        <button
          onClick={() => {
            void enterImmersive(true);
            dismiss();
          }}
          className="h-8 shrink-0 rounded-sm bg-blue-500 px-2.5 text-white font-medium"
        >
          Xoay ngay
        </button>
      )}
      <button
        aria-label="Đóng gợi ý xoay màn hình"
        onClick={dismiss}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm hover:bg-[#292929]"
      >
        <X size={16} />
      </button>
    </div>
  );
}
