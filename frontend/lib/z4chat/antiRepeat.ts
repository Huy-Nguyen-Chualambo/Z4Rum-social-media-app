/**
 * Repetition detection for Z4chat.
 *
 * The single loudest complaint about the app we are modelling ourselves on is
 * "char bị lặp câu/từ". Everything here is a pure function over text so it can
 * run in the API route before a reply is shown, and be unit-tested later
 * without any harness.
 */

/** How similar a reply may be to a recent one before we flag it. */
export const REPEAT_SIMILARITY_THRESHOLD = 0.45;

/** How much of an opening phrase must overlap to count as "the same opener". */
export const OPENER_OVERLAP_THRESHOLD = 0.75;

/** Words in the opening phrase we compare. */
export const OPENER_WORDS = 6;

/** Lowercase, drop punctuation and roleplay markup, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_~`>#]/g, " ")
    .replace(/[.,!?;:()[\]{}"'‘’“”—–…-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function words(text: string): string[] {
  const normalized = normalize(text);
  return normalized ? normalized.split(" ") : [];
}

/** Word n-grams as a set. Defaults to trigrams. */
export function ngrams(text: string, size = 3): Set<string> {
  const tokens = words(text);
  const result = new Set<string>();
  if (tokens.length < size) {
    if (tokens.length) result.add(tokens.join(" "));
    return result;
  }
  for (let i = 0; i <= tokens.length - size; i += 1) {
    result.add(tokens.slice(i, i + size).join(" "));
  }
  return result;
}

/** Jaccard similarity of two texts over word trigrams. 0 = unrelated, 1 = identical. */
export function similarity(a: string, b: string): number {
  const left = ngrams(a);
  const right = ngrams(b);
  if (!left.size || !right.size) return 0;

  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared += 1;

  return shared / (left.size + right.size - shared);
}

/** Highest similarity between `candidate` and any of `previous`. */
export function maxSimilarity(candidate: string, previous: string[]): number {
  return previous.reduce((highest, text) => Math.max(highest, similarity(candidate, text)), 0);
}

/** The normalized opening phrase of a reply. */
export function openerOf(text: string, size = OPENER_WORDS): string {
  return words(text).slice(0, size).join(" ");
}

/** Openers of the most recent replies, newest first, deduplicated. */
export function extractBannedOpeners(previous: string[], limit = 6): string[] {
  const seen = new Set<string>();
  const openers: string[] = [];
  for (const text of [...previous].reverse()) {
    const opener = openerOf(text);
    if (!opener || seen.has(opener)) continue;
    seen.add(opener);
    openers.push(opener);
    if (openers.length >= limit) break;
  }
  return openers;
}

/** Fraction of `a`'s words that also appear in `b`. */
function wordOverlap(a: string, b: string): number {
  const left = words(a);
  if (!left.length) return 0;
  const right = new Set(words(b));
  return left.filter((word) => right.has(word)).length / left.length;
}

/**
 * True when `candidate` starts the same way as something said recently -
 * either verbatim or with most of the same words in the opening phrase.
 */
export function isRepeatedOpener(candidate: string, bannedOpeners: string[]): boolean {
  const opener = openerOf(candidate);
  if (!opener) return false;
  return bannedOpeners.some(
    (banned) => banned === opener || wordOverlap(opener, banned) >= OPENER_OVERLAP_THRESHOLD
  );
}

/**
 * Phrases the character has leaned on across several recent replies. These are
 * the tics that make a character feel like a broken record, so we name them
 * explicitly in the prompt instead of hoping a penalty setting catches them.
 */
export function overusedPhrases(
  previous: string[],
  { size = 4, minReplies = 2, limit = 8 }: { size?: number; minReplies?: number; limit?: number } = {}
): string[] {
  const repliesPerPhrase = new Map<string, number>();

  for (const text of previous) {
    // Count each phrase once per reply: a phrase repeated inside one long reply
    // is a style choice, the same phrase across replies is a tic.
    for (const gram of ngrams(text, size)) {
      repliesPerPhrase.set(gram, (repliesPerPhrase.get(gram) || 0) + 1);
    }
  }

  return [...repliesPerPhrase.entries()]
    .filter(([, count]) => count >= minReplies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase]) => phrase);
}

/**
 * Index just past the first sentence in `buffer`, or -1 if there is not enough
 * text yet. Used to hold back the opening line while streaming: if it turns out
 * to repeat, we can restart before the user has read anything.
 */
export function openerBoundary(buffer: string, minChars = 40, maxChars = 160): number {
  if (buffer.length >= maxChars) return maxChars;
  const match = /[.!?…]["'’”]?\s/.exec(buffer.slice(minChars));
  if (!match) return -1;
  return minChars + match.index + match[0].length;
}
