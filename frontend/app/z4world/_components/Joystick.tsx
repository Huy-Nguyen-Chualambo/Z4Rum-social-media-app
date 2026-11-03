"use client";
import { useEffect, useRef, useState } from "react";
export default function Joystick({
  onChange,
  disabled,
}: {
  onChange: (value: { dx: number; dy: number }) => void;
  disabled: boolean;
}) {
  const [stick, setStick] = useState({ dx: 0, dy: 0 });
  const active = useRef<number | null>(null);
  useEffect(() => {
    const clear = () => {
      active.current = null;
      setStick({ dx: 0, dy: 0 });
    };
    window.addEventListener("blur", clear);
    return () => window.removeEventListener("blur", clear);
  }, []);
  const reset = () => {
    active.current = null;
    setStick({ dx: 0, dy: 0 });
    onChange({ dx: 0, dy: 0 });
  };
  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || active.current !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - bounds.x - bounds.width / 2) / 38,
      dy = (event.clientY - bounds.y - bounds.height / 2) / 38;
    const length = Math.hypot(dx, dy),
      scale = Math.max(1, length);
    const value =
      length < 0.16 ? { dx: 0, dy: 0 } : { dx: dx / scale, dy: dy / scale };
    setStick(value);
    onChange(value);
  };
  return (
    <div
      role="group"
      aria-label="Joystick di chuyển"
      aria-disabled={disabled}
      className={`relative flex h-28 w-28 scroll-mb-28 scroll-mt-24 touch-none select-none items-center justify-center rounded-full border border-[#383838] bg-[#141414]/80 ${disabled ? "opacity-40" : ""}`}
      onPointerDown={(e) => {
        if (disabled) return;
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={update}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={() => {
        if (active.current !== null) reset();
      }}
    >
      <span className="pointer-events-none absolute text-xs text-white/60">
        ✥
      </span>
      <span
        className="pointer-events-none h-12 w-12 rounded-full border border-[#4a4a4a] bg-[#292929]"
        style={{
          transform: `translate(${stick.dx * 32}px,${stick.dy * 32}px)`,
        }}
      />
    </div>
  );
}
