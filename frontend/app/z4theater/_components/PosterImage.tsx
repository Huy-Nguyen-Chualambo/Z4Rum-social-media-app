"use client";
import { useState } from "react";
import { posterUrl } from "@/lib/theater/posterUrl";

/** A small copy of the poster, falling back to the original if the optimizer refuses. */
export default function PosterImage({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  const [failed, setFailed] = useState("");
  const small = posterUrl(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed === src ? src : small}
      alt=""
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        if (small !== src) setFailed(src);
      }}
    />
  );
}
