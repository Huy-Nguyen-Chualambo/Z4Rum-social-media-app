"use client";

import { useEffect } from "react";

/** Keep mobile chat panels inside the visible area above the software keyboard. */
export default function MobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      document.documentElement.style.setProperty("--visible-height", `${viewport.height}px`);
      document.documentElement.style.setProperty("--visible-top", `${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.documentElement.style.removeProperty("--visible-height");
      document.documentElement.style.removeProperty("--visible-top");
    };
  }, []);
  return null;
}
