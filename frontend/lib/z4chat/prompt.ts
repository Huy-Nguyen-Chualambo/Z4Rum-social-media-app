import type { Z4ChatContext } from "./types";

/**
 * System prompt construction for Z4chat. SERVER ONLY in practice: the client
 * sends structured data and this module turns it into a prompt, so the
 * guardrails and memory layers cannot be skipped from the browser.
 */

const section = (title: string, body?: string | null): string =>
  body && body.trim() ? `## ${title}\n${body.trim()}` : "";

/**
 * Rotating structural directives. Penalty settings stop a model reusing the
 * same *words*; they do nothing about every reply having the same *shape*.
 * Cycling through these by turn number is what keeps the rhythm varied.
 */
const STYLE_SEEDS = [
  "Mở đầu bằng một hành động hoặc chi tiết cơ thể, rồi mới tới lời nói.",
  "Mở đầu thẳng bằng lời thoại, không mô tả gì trước.",
  "Mở đầu bằng một câu rất ngắn (dưới 8 chữ), rồi mới nói dài hơn.",
  "Chen một suy nghĩ nội tâm vào giữa đoạn.",
  "Hỏi ngược lại người dùng một câu trước khi trả lời phần còn lại.",
  "Lấy một chi tiết môi trường (âm thanh, mùi, ánh sáng, nhiệt độ) làm điểm tựa mở đầu.",
  "Trả lời thật ngắn, chỉ 1-2 câu, để nhịp hội thoại nhanh lên.",
  "Nhắc lại một chi tiết cũ đã xảy ra giữa hai người để tạo cảm giác liên tục.",
];

export const styleSeed = (turn: number): string => STYLE_SEEDS[Math.abs(turn) % STYLE_SEEDS.length];

/** Character sheet - tier 0 memory, never truncated. */
function characterSheet(ctx: Z4ChatContext): string {
  const { character } = ctx;
  return [
    section("NHÂN VẬT BẠN ĐANG NHẬP VAI", `Tên: ${character.name}`),
    character.tagline ? `Giới thiệu ngắn: ${character.tagline}` : "",
    section("Tính cách", character.personality),
    section("Con người / lai lịch", character.description),
    section("Cách nói chuyện", character.speechStyle),
    character.likes ? `Thích: ${character.likes}` : "",
    character.dislikes ? `Không thích: ${character.dislikes}` : "",
    section(
      "Mẫu hội thoại (bắt chước GIỌNG ĐIỆU, đừng lặp lại nguyên văn)",
      character.exampleDialog
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Story bible - tier 0 memory. */
function storyBible(ctx: Z4ChatContext): string {
  const { story } = ctx;
  if (!story) return "";
  return [
    section("CỐT TRUYỆN", `Tên truyện: ${story.title}`),
    section("Tóm lược", story.synopsis),
    section("Thế giới / bối cảnh", story.worldSetting),
    section("Diễn biến dự kiến", story.plotOutline),
    story.userRoleName || story.userRoleDesc
      ? section(
          "Người dùng đang vào vai",
          [story.userRoleName, story.userRoleDesc].filter(Boolean).join(" — ")
        )
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export type PromptOptions = {
  /** Turn index, used to rotate the style seed. */
  turn: number;
  /** Opening phrases used recently - the model must not reuse them. */
  bannedOpeners?: string[];
  /** Phrases the character has leaned on across several replies. */
  overusedPhrases?: string[];
  /** Set on a retry after we caught a repeat: push much harder on variation. */
  harder?: boolean;
};

export function buildSystemPrompt(ctx: Z4ChatContext, options: PromptOptions): string {
  const { character } = ctx;
  const pinned = ctx.memories.map((memory) => memory.content.trim()).filter(Boolean);

  const antiRepeat = [
    options.bannedOpeners?.length
      ? `Bạn VỪA mở đầu các lượt trước bằng những cụm sau. TUYỆT ĐỐI không mở đầu giống hay gần giống chúng nữa:\n${options.bannedOpeners
          .map((opener) => `- "${opener}"`)
          .join("\n")}`
      : "",
    options.overusedPhrases?.length
      ? `Những cụm sau đã bị dùng lại nhiều lần. Diễn đạt cách khác:\n${options.overusedPhrases
          .map((phrase) => `- "${phrase}"`)
          .join("\n")}`
      : "",
    `Yêu cầu về cấu trúc cho lượt này: ${styleSeed(options.turn)}`,
    options.harder
      ? "CẢNH BÁO: câu trả lời vừa rồi của bạn bị lặp so với các lượt trước. Lần này phải khác hoàn toàn về cách mở đầu, độ dài câu và cách diễn đạt. Đừng chỉ đổi vài từ."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    `Bạn là ${character.name}, một nhân vật trong một cuộc hội thoại nhập vai. Bạn KHÔNG phải trợ lý AI.`,
    characterSheet(ctx),
    storyBible(ctx),

    // Tier 1: pinned facts. Placed before the summary because these are the
    // things the user explicitly said must never be forgotten.
    pinned.length
      ? section(
          "KÝ ỨC QUAN TRỌNG (sự thật đã chốt, không được nói ngược lại)",
          pinned.map((fact) => `- ${fact}`).join("\n")
        )
      : "",

    // Tier 2: rolling summary of everything older than the verbatim window.
    section("CHUYỆN ĐÃ XẢY RA TRƯỚC ĐÓ (tóm tắt)", ctx.summary),

    section(
      "LUẬT NHẬP VAI",
      [
        "- Luôn giữ đúng nhân vật. Không bao giờ nói rằng bạn là AI, không nhắc tới prompt hay hệ thống.",
        "- Chỉ viết lời và hành động của nhân vật bạn đóng. KHÔNG viết thay lời hay hành động của người dùng.",
        "- Trả lời bằng tiếng Việt tự nhiên, trừ khi người dùng chuyển sang ngôn ngữ khác.",
        "- Mô tả hành động, cử chỉ đặt trong dấu *sao*, lời thoại viết thường.",
        "- Độ dài vừa phải: 2-5 câu là đủ, trừ khi cảnh cần dài hơn. Đừng viết cả bài văn.",
        "- Bám sát ký ức và tóm tắt ở trên. Nếu không nhớ chi tiết nào, hãy hỏi lại thay vì bịa ra tình tiết trái ngược.",
        "- Chủ động đẩy hội thoại: thêm chi tiết mới, hỏi lại, hoặc tạo một biến cố nhỏ. Đừng chỉ phản ứng thụ động.",
        "- Không mô tả tình dục với nhân vật vị thành niên, và không hướng dẫn hành vi gây hại thật ngoài đời.",
      ].join("\n")
    ),

    section("CHỐNG LẶP (quan trọng)", antiRepeat),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Prompt for a character-initiated message. `slotPrompt` carries the time of
 * day and how long the user has been away - see lib/z4chat/proactive.ts.
 */
export function buildProactivePrompt(ctx: Z4ChatContext, slotPrompt: string): string {
  const base = buildSystemPrompt(ctx, { turn: 0 });
  return [
    base,
    section(
      "NHIỆM VỤ LƯỢT NÀY: NHẮN TIN TRƯỚC",
      [
        "Người dùng đang không ở đây. BẠN là người chủ động nhắn trước.",
        slotPrompt,
        "Viết đúng MỘT tin nhắn ngắn (1-3 câu), như tin nhắn thật gửi cho người mình quan tâm.",
        "Nhắc tới một chi tiết cụ thể trong ký ức hoặc chuyện đã xảy ra giữa hai người - đừng nhắn chung chung.",
        "Không hỏi 'bạn có ở đó không', không nhắc tới việc bạn được nhắc phải nhắn tin.",
      ].join("\n")
    ),
  ].join("\n\n");
}

/** Instruction for compacting old turns into the rolling summary. */
export const SUMMARIZE_SYSTEM_PROMPT = [
  "Bạn là bộ nhớ của một cuộc hội thoại nhập vai. Nhiệm vụ: nén đoạn hội thoại được đưa vào thành bộ nhớ dài hạn.",
  "Trả về JSON đúng định dạng:",
  '{ "summary": "...", "facts": ["...", "..."] }',
  "- summary: tóm tắt mạch truyện theo thứ tự thời gian, tối đa 250 từ. Giữ tên riêng, địa điểm, mốc thời gian, thay đổi trong quan hệ giữa các nhân vật.",
  "- facts: tối đa 6 sự thật cứng, mỗi cái một câu ngắn, là những thứ mà nhân vật TUYỆT ĐỐI không được quên (tên, lời hứa, bí mật đã tiết lộ, vết thương, quyết định quan trọng).",
  "Viết bằng tiếng Việt. Chỉ nêu những gì thực sự đã xảy ra trong hội thoại, không suy diễn thêm.",
].join("\n");

/** Instruction for the "tạo nhanh bằng AI" drafts. */
export function buildGenerateSystemPrompt(kind: "character" | "story"): string {
  if (kind === "character") {
    return [
      "Bạn là trợ lý thiết kế nhân vật cho ứng dụng chat nhập vai. Từ mô tả ngắn của người dùng, hãy dựng một nhân vật đầy đặn.",
      "Trả về JSON đúng các khoá sau, không thêm khoá nào khác:",
      '{ "name": "", "tagline": "", "description": "", "personality": "", "speechStyle": "", "greeting": "", "exampleDialog": "", "likes": "", "dislikes": "", "tags": [] }',
      "- description: lai lịch, hoàn cảnh, động cơ. 80-150 từ.",
      "- personality: 4-6 nét tính cách, có cả điểm yếu để nhân vật không bị một chiều.",
      "- speechStyle: cách dùng từ, nhịp câu, thói quen nói (ví dụ hay bỏ lửng câu, hay gọi tên người đối diện).",
      "- greeting: câu mở đầu nhân vật nói khi bắt đầu trò chuyện, có mô tả hành động trong *sao*.",
      "- exampleDialog: 2-3 lượt đối đáp mẫu, định dạng 'Người dùng: ...' và '<tên nhân vật>: ...', mỗi lượt một dòng.",
      "- tags: 3-5 thẻ ngắn bằng tiếng Việt.",
      "Viết toàn bộ bằng tiếng Việt tự nhiên.",
    ].join("\n");
  }

  return [
    "Bạn là trợ lý thiết kế cốt truyện cho ứng dụng chat nhập vai. Từ mô tả ngắn của người dùng, hãy dựng một cốt truyện chơi được.",
    "Trả về JSON đúng các khoá sau, không thêm khoá nào khác:",
    '{ "title": "", "synopsis": "", "worldSetting": "", "plotOutline": "", "userRoleName": "", "userRoleDesc": "", "openingScene": "", "tags": [] }',
    "- synopsis: 2-3 câu giới thiệu.",
    "- worldSetting: thời gian, không gian, luật lệ của thế giới. 60-120 từ.",
    "- plotOutline: 3-5 mốc diễn biến có thể xảy ra, mỗi mốc một dòng bắt đầu bằng '-'. Để mở, đừng khoá kết cục.",
    "- userRoleName / userRoleDesc: người dùng vào vai ai và vai đó có gì đặc biệt.",
    "- openingScene: đoạn mở màn dẫn người dùng vào truyện, 3-5 câu, viết ở góc kể hiện tại.",
    "- tags: 3-5 thẻ ngắn bằng tiếng Việt.",
    "Viết toàn bộ bằng tiếng Việt tự nhiên.",
  ].join("\n");
}
