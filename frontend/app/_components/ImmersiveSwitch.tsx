"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { exitImmersive } from "@/lib/world/immersive";

/** Full-screen routes render without the site's navigation and side columns. */
export default function ImmersiveSwitch({
  page,
  shell,
}: {
  page: ReactNode;
  shell: ReactNode;
}) {
  const immersive = usePathname().startsWith("/z4world/play");
  useEffect(() => {
    if (!immersive) exitImmersive();
  }, [immersive]);
  return immersive ? page : shell;
}
