// Keep Vietnamese accents: removing them would also block ordinary words.
export const BLOCKED_POST_TERMS = [
  "sex", "porn", "porno", "pornhub", "xxx", "hentai",
  "nứng", "dâm", "đụ", "địt", "đéo", "cặc", "buồi", "lồn",
  "đĩ", "điếm", "chịch", "xoạc", "nung", "dit",
  "đụ má", "địt mẹ", "địt má", "đù má", "vãi lồn", "vãi cặc",
  "đm", "đmm", "đcm", "đcmn", "dm", "dmm", "dcm", "dcmn",
  "vcl", "vkl", "vl", "cc", "clgt",
  "khiêu dâm", "khieu dam", "ấu dâm", "au dam",
  "loạn luân", "loan luan", "phim sex", "bú cu", "bu cu",
  "fuck", "fucking", "motherfucker", "bullshit", "shit",
  "bitch", "asshole", "blowjob", "handjob",
] as const;

function normalizeContent(content: string): string {
  return content.normalize("NFKC").toLowerCase()
    .replace(/\p{Cf}/gu, "")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

const blockedTerms = new Set(BLOCKED_POST_TERMS.map(normalizeContent));
const maxWords = Math.max(...Array.from(blockedTerms, term => term.split(" ").length));

export function containsBlockedPostTerm(content: string): boolean {
  const words = normalizeContent(content).split(" ");
  for (let start = 0; start < words.length; start++) {
    for (let length = 1; length <= maxWords && start + length <= words.length; length++) {
      if (blockedTerms.has(words.slice(start, start + length).join(" "))) return true;
    }
  }
  return false;
}

export function validatePostContent(content: unknown): string | null {
  if (typeof content !== "string" || !content.trim()) {
    return "Vui lòng nhập nội dung bài viết.";
  }
  if (containsBlockedPostTerm(content)) {
    return "Bài viết chứa từ ngữ không phù hợp. Vui lòng chỉnh sửa nội dung trước khi đăng.";
  }
  return null;
}
