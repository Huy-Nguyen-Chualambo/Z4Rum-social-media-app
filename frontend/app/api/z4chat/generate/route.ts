import { NextRequest, NextResponse } from "next/server";
import { buildGenerateSystemPrompt } from "@/lib/z4chat/prompt";
import { chatText } from "@/lib/z4chat/providers";
import { parseJsonReply, providerErrorResponse } from "@/lib/z4chat/request";

export const dynamic = "force-dynamic";

/** Keys we hand back per kind - anything else the model invents is dropped. */
const CHARACTER_KEYS = [
  "name",
  "tagline",
  "description",
  "personality",
  "speechStyle",
  "greeting",
  "exampleDialog",
  "likes",
  "dislikes",
] as const;

const STORY_KEYS = [
  "title",
  "synopsis",
  "worldSetting",
  "plotOutline",
  "userRoleName",
  "userRoleDesc",
  "openingScene",
] as const;

/**
 * "Tạo nhanh bằng AI": one line of intent becomes a filled-in character or story
 * form. The user still edits everything before saving - this only removes the
 * blank-page problem, which is where most people give up on making a character.
 */
export async function POST(req: NextRequest) {
  let body: { kind?: string; brief?: string; provider?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không phải JSON" }, { status: 400 });
  }

  const kind = body.kind === "story" ? "story" : "character";
  const brief = (body.brief || "").trim().slice(0, 1500);
  if (!brief) return NextResponse.json({ error: "Hãy mô tả ngắn ý tưởng của bạn" }, { status: 400 });

  try {
    const reply = await chatText(body.provider, {
      messages: [
        { role: "system", content: buildGenerateSystemPrompt(kind) },
        { role: "user", content: brief },
      ],
      model: body.model,
      temperature: 0.95,
      maxTokens: 1600,
      json: true,
    });

    const parsed = parseJsonReply<Record<string, unknown>>(reply);
    if (!parsed) return NextResponse.json({ error: "AI trả về dữ liệu không đọc được" }, { status: 502 });

    const keys = kind === "story" ? STORY_KEYS : CHARACTER_KEYS;
    const draft: Record<string, unknown> = {};
    for (const key of keys) {
      const value = parsed[key];
      if (typeof value === "string" && value.trim()) draft[key] = value.trim();
      // plotOutline sometimes arrives as an array of beats.
      else if (Array.isArray(value)) draft[key] = value.filter((item) => typeof item === "string").join("\n");
    }

    draft.tags = Array.isArray(parsed.tags)
      ? parsed.tags
          .map((tag) => (typeof tag === "string" ? tag.trim().slice(0, 32) : ""))
          .filter(Boolean)
          .slice(0, 6)
      : [];

    const required = kind === "story" ? "title" : "name";
    if (!draft[required]) return NextResponse.json({ error: "AI không tạo được bản nháp" }, { status: 502 });

    return NextResponse.json(draft);
  } catch (error) {
    return providerErrorResponse(error);
  }
}
