const OPTIMIZED_HOST = "phimimg.com";
// One width for every poster: the same copy serves all sizes and uses up fewer conversions.
const WIDTH = 256;

/** The primary source's posters run up to 2 MB; this asks our own optimizer for a small copy. */
export function posterUrl(src: string) {
  try {
    if (new URL(src).hostname !== OPTIMIZED_HOST) return src;
  } catch {
    return src;
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=${WIDTH}&q=75`;
}
