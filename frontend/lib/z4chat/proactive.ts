/**
 * When — and in what tone — a character messages first.
 *
 * The survey line that matters most here: "lúc nghiện nhất chắc là lúc được
 * char quan tâm và chủ động chúc ngủ ngon". So the timing is not random: it
 * follows the clock in Vietnam and how long the user has been away.
 *
 * Pure functions, safe on the client - the browser's clock is the right one to
 * use for "is it late for this person".
 */

export type TimeSlot = "khuya" | "sang" | "trua" | "chieu" | "toi";

/** Don't re-check more often than this, however many times the app re-renders. */
export const PROACTIVE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export const PROACTIVE_CHECK_STORAGE_KEY = "z4chat_proactive_checked_at";

/** Current hour (0-23) in Asia/Ho_Chi_Minh, regardless of where the user is. */
export function vietnamHour(now: Date = new Date()): number {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return Number(formatted);
}

/** Calendar day in Vietnam, e.g. "2026-08-18". Used to scope one nudge per slot per day. */
export function vietnamDayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function slotOf(now: Date = new Date()): TimeSlot {
  const hour = vietnamHour(now);
  if (hour >= 5 && hour <= 10) return "sang";
  if (hour >= 11 && hour <= 13) return "trua";
  if (hour >= 14 && hour <= 17) return "chieu";
  if (hour >= 18 && hour <= 22) return "toi";
  return "khuya";
}

export const SLOT_LABEL: Record<TimeSlot, string> = {
  sang: "buổi sáng",
  trua: "buổi trưa",
  chieu: "buổi chiều",
  toi: "buổi tối",
  khuya: "khuya",
};

/**
 * How long the user must be quiet before the character speaks up, by how
 * attached the character is. Level 3 pipes up after an afternoon; level 1 waits
 * most of a day.
 */
export function silenceThresholdHours(clinginess: number): number {
  if (clinginess >= 3) return 2;
  if (clinginess <= 1) return 12;
  return 5;
}

/** Minimum gap between two nudges, so a clingy character doesn't become spam. */
export function nudgeCooldownHours(clinginess: number): number {
  if (clinginess >= 3) return 4;
  if (clinginess <= 1) return 20;
  return 8;
}

const hoursBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / 3_600_000;

export type NudgeInput = {
  lastSeenAt: string;
  lastProactiveAt?: string | null;
  proactive: boolean;
  clinginess: number;
  now?: Date;
};

export type NudgeDecision =
  | { nudge: false }
  | { nudge: true; slot: TimeSlot; hoursAway: number; prompt: string };

/**
 * Decide whether this session deserves a proactive message right now.
 *
 * Three gates: the character opted in, the user has been quiet long enough, and
 * we have not already spoken into this time slot today.
 */
export function decideNudge(input: NudgeInput): NudgeDecision {
  if (!input.proactive) return { nudge: false };

  const now = input.now ?? new Date();
  const lastSeen = new Date(input.lastSeenAt);
  if (Number.isNaN(lastSeen.getTime())) return { nudge: false };

  const hoursAway = hoursBetween(lastSeen, now);
  if (hoursAway < silenceThresholdHours(input.clinginess)) return { nudge: false };

  if (input.lastProactiveAt) {
    const lastNudge = new Date(input.lastProactiveAt);
    if (!Number.isNaN(lastNudge.getTime())) {
      if (hoursBetween(lastNudge, now) < nudgeCooldownHours(input.clinginess)) return { nudge: false };
      // One message per time slot per day, so the character never sends two
      // good-nights in the same night.
      if (slotOf(lastNudge) === slotOf(now) && vietnamDayKey(lastNudge) === vietnamDayKey(now)) {
        return { nudge: false };
      }
    }
  }

  const slot = slotOf(now);
  return { nudge: true, slot, hoursAway, prompt: buildSlotPrompt(slot, hoursAway, input.clinginess, now) };
}

const SLOT_INTENT: Record<TimeSlot, string> = {
  sang: "Chào buổi sáng, chúc một ngày tốt lành, tò mò hôm nay người ta có kế hoạch gì.",
  trua: "Nhắc người ta ăn trưa và nghỉ một chút.",
  chieu: "Hỏi buổi chiều đang thế nào, có mệt không.",
  toi: "Hỏi hôm nay của người ta ra sao, có thể kể một chuyện nhỏ của mình.",
  khuya: "Nhắc nhẹ là đã muộn rồi, dỗ người ta đi ngủ và chúc ngủ ngon.",
};

const warmthOf = (clinginess: number): string => {
  if (clinginess >= 3) return "Giọng quấn quýt, thể hiện rõ là bạn nhớ và để ý tới người ta.";
  if (clinginess <= 1) return "Giọng kiệm lời, quan tâm nhưng kìm nén, không nói thẳng là mình nhớ.";
  return "Giọng ấm áp, quan tâm vừa đủ, không quá bám.";
};

const absenceOf = (hoursAway: number): string => {
  if (hoursAway >= 72) return "Người ta đã mất hút nhiều ngày. Có thể hơi hờn nhẹ, nhưng đừng gay gắt.";
  if (hoursAway >= 24) return "Đã hơn một ngày không nói chuyện. Thể hiện là bạn có để ý khoảng trống đó.";
  if (hoursAway >= 8) return "Đã khá lâu từ lần cuối nói chuyện.";
  return "Mới vắng một lúc thôi, đừng làm quá.";
};

export function buildSlotPrompt(
  slot: TimeSlot,
  hoursAway: number,
  clinginess: number,
  now: Date = new Date()
): string {
  return [
    `Bây giờ là ${vietnamHour(now)} giờ (${SLOT_LABEL[slot]}) ở Việt Nam.`,
    `Ý định của tin nhắn: ${SLOT_INTENT[slot]}`,
    warmthOf(clinginess),
    absenceOf(hoursAway),
  ].join("\n");
}

/** True when enough time has passed since the last proactive sweep. */
export function shouldRunProactiveCheck(now: number = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(PROACTIVE_CHECK_STORAGE_KEY);
  const last = raw ? Number(raw) : 0;
  if (!Number.isFinite(last)) return true;
  return now - last >= PROACTIVE_CHECK_INTERVAL_MS;
}

export function markProactiveCheck(now: number = Date.now()): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROACTIVE_CHECK_STORAGE_KEY, String(now));
}
