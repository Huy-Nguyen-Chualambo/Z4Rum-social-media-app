import { NextRequest, NextResponse } from "next/server";
import { extractBannedOpeners } from "@/lib/z4chat/antiRepeat";
import { buildProactivePrompt } from "@/lib/z4chat/prompt";
import { chatText } from "@/lib/z4chat/providers";
import { normalizeContext, providerErrorResponse, RECENT_REPLIES } from "@/lib/z4chat/request";

export const dynamic = "force-dynamic";

/**
 * The message the character sends unprompted.
 *
 * This is the feature the survey singled out - "được char quan tâm và chủ động
 * chúc ngủ ngon" - so the wording matters more than the plumbing. `slotPrompt`
 * (built client-side from the Vietnam clock and how long the user has been away)
 * carries the intent; the character sheet and pinned memories make it specific
 * rather than a generic greeting.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không phải JSON" }, { status: 400 });
  }

  const ctx = normalizeContext(body);
  if (!ctx) return NextResponse.json({ error: "Thiếu thông tin nhân vật" }, { status: 400 });

  const slotPrompt = (body?.slotPrompt || "").trim().slice(0, 1000);
  if (!slotPrompt) return NextResponse.json({ error: "Thiếu ngữ cảnh thời gian" }, { status: 400 });

  const bannedOpeners = extractBannedOpeners(
    ctx.history.filter((item) => item.role === "assistant").slice(-RECENT_REPLIES).map((item) => item.content)
  );

  try {
    const reply = await chatText(ctx.provider, {
      messages: [
        { role: "system", content: buildProactivePrompt(ctx, slotPrompt) },
        {
          role: "user",
          content: [
            "Hãy viết tin nhắn chủ động đó ngay bây giờ. Chỉ trả về nội dung tin nhắn, không thêm giải thích.",
            bannedOpeners.length
              ? `Đừng mở đầu giống những lần trước: ${bannedOpeners.map((opener) => `"${opener}"`).join(", ")}.`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      model: ctx.model,
      temperature: 1,
      maxTokens: 260,
    });

    const content = reply.replace(/^\s*["“]|["”]\s*$/g, "").trim();
    if (!content) return NextResponse.json({ error: "AI không trả về nội dung" }, { status: 502 });

    return NextResponse.json({ content });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
