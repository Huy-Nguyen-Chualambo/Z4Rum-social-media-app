"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Full-screen routes render without the site's navigation and side columns. */
export default function ImmersiveSwitch({
  page,
  shell,
}: {
  page: ReactNode;
  shell: ReactNode;
}) {
  const immersive = /^\/z4theater\/[^/]+/.test(usePathname());
  return immersive ? page : shell;
}
