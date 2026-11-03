// Listed in next.config.ts too, which refuses any other host.
const OPTIMIZED_HOSTS = ["phimimg.com", "img.nguonc.com"];
// One width for every poster: the same copy serves all sizes and uses up fewer conversions.
const WIDTH = 256;

/** Source posters run up to 2 MB; this asks our own optimizer for a small copy. */
export function posterUrl(src: string) {
  try {
    if (!OPTIMIZED_HOSTS.includes(new URL(src).hostname)) return src;
  } catch {
    return src;
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=${WIDTH}&q=75`;
}
