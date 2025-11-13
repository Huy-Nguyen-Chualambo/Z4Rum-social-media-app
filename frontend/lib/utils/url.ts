export function normalizeBaseUrl(raw: string, defaultProtocol: "http" | "https" = "https") {
  let url = (raw || "").trim();

  // Handle //host
  if (/^\/\//.test(url)) url = `${defaultProtocol}:` + url;

  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) url = `${defaultProtocol}://${url}`;

  // Strip trailing slashes
  url = url.replace(/\/+$/, "");

  return url;
}

export const API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  typeof window !== "undefined" ? (location.protocol === "https:" ? "https" : "http") : "https"
);

export const SOCKET_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  typeof window !== "undefined" ? (location.protocol === "https:" ? "https" : "http") : "https"
);