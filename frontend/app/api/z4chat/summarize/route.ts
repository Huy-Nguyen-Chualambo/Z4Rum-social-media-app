import { NextRequest, NextResponse } from "next/server";
import { SUMMARIZE_SYSTEM_PROMPT } from "@/lib/z4chat/prompt";
import { chatText } from "@/lib/z4chat/providers";
import { parseJsonReply, providerErrorResponse } from "@/lib/z4chat/request";

export const dynamic = "force-dynamic";

type SummarizeBody = {
  /** Turns to fold into long-term memory, oldest first. */
  messages?: Array<{ role?: string; content?: string }>;
  /** Summary so far, so the new one continues it instead of replacing it. */
  previousSummary?: string;
  characterName?: string;
  provider?: string;
  model?: string;
};

/**
 * Compact old turns into the rolling summary (tier 2) and harvest hard facts
 * worth pinning (tier 1). Called by the client once a session outgrows the
 * verbatim window; the result is persisted through the Express backend.
 */
export async function POST(req: NextRequest) {
  let body: SummarizeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không phải JSON" }, { status: 400 });
  }

  const transcript = (Array.isArray(body.messages) ? body.messages : [])
    .map((item) => {
      const content = typeof item?.content === "string" ? item.content.trim() : "";
      if (!content) return "";
      const speaker = item?.role === "assistant" ? body.characterName || "Nhân vật" : "Người dùng";
      return `${speaker}: ${content}`;
    })
    .filter(Boolean)
    .join("\n")
    .slice(-24000);

  if (!transcript) return NextResponse.json({ error: "Không có nội dung để tóm tắt" }, { status: 400 });

  const previous = (body.previousSummary || "").trim().slice(0, 8000);

  try {
    const reply = await chatText(body.provider, {
      messages: [
        { role: "system", content: SUMMARIZE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            previous ? `Tóm tắt hiện có (hãy nối tiếp, đừng bỏ mất):\n${previous}` : "",
            `Đoạn hội thoại cần nén:\n${transcript}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
      model: body.model,
      // Memory should be faithful, not creative.
      temperature: 0.3,
      frequencyPenalty: 0,
      presencePenalty: 0,
      maxTokens: 900,
      json: true,
    });

    const parsed = parseJsonReply<{ summary?: unknown; facts?: unknown }>(reply);
    const summary = typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
    if (!summary) return NextResponse.json({ error: "Không tóm tắt được" }, { status: 502 });

    const facts = Array.isArray(parsed?.facts)
      ? parsed.facts
          .map((fact) => (typeof fact === "string" ? fact.trim().slice(0, 300) : ""))
          .filter(Boolean)
          .slice(0, 8)
      : [];

    return NextResponse.json({ summary, facts });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
