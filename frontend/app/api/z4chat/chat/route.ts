import { NextRequest, NextResponse } from "next/server";
import {
  extractBannedOpeners,
  isRepeatedOpener,
  openerBoundary,
  overusedPhrases,
} from "@/lib/z4chat/antiRepeat";
import { buildSystemPrompt } from "@/lib/z4chat/prompt";
import { callChat, streamDeltas, type CallResult, type ChatMessage } from "@/lib/z4chat/providers";
import { normalizeContext, providerErrorResponse, RECENT_REPLIES } from "@/lib/z4chat/request";

export const dynamic = "force-dynamic";

/**
 * One role-play turn, streamed as plain text.
 *
 * The client sends structured context and gets back characters as they arrive.
 * Two of the three anti-repetition layers live here: the prompt-side ban list,
 * and the opener guard that quietly restarts a reply which begins like a recent
 * one. The client handles the third (a similarity nudge after the fact) because
 * that one is a suggestion, not a silent correction.
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
  if (!ctx.history.length) {
    return NextResponse.json({ error: "Chưa có nội dung để trả lời" }, { status: 400 });
  }

  const turn = Number(body?.turn) || ctx.history.length;

  const recentReplies = ctx.history
    .filter((item) => item.role === "assistant")
    .slice(-RECENT_REPLIES)
    .map((item) => item.content);

  const bannedOpeners = extractBannedOpeners(recentReplies);
  const overused = overusedPhrases(recentReplies);

  const messagesFor = (harder: boolean): ChatMessage[] => [
    {
      role: "system",
      content: buildSystemPrompt(ctx, { turn, bannedOpeners, overusedPhrases: overused, harder }),
    },
    ...ctx.history,
  ];

  const call = (harder: boolean) =>
    callChat(ctx.provider, {
      messages: messagesFor(harder),
      model: ctx.model,
      stream: true,
      temperature: harder ? 1 : 0.9,
    });

  // Open the first attempt before returning a response so key/quota/network
  // failures come back as a real status code the client can branch on. Once we
  // hand over a stream, all we can do is end it early.
  let result: CallResult;
  try {
    result = await call(false);
  } catch (error) {
    return providerErrorResponse(error);
  }

  const namePrefix = new RegExp(`^\\s*${escapeRegExp(ctx.character.name)}\\s*[:：]\\s*`, "i");
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let retried = false;

      try {
        // Each pass over this loop is one attempt at the reply. The loop runs a
        // second time only when the opener guard rejected the first attempt,
        // which it can do safely because nothing has been sent yet.
        for (;;) {
          let buffer = "";
          let flushed = false;
          let restart = false;

          for await (const delta of streamDeltas(result.response)) {
            if (flushed) {
              controller.enqueue(encoder.encode(delta));
              continue;
            }

            buffer += delta;
            // Models sometimes prefix their own name even when told not to.
            buffer = buffer.replace(namePrefix, "");

            const boundary = openerBoundary(buffer);
            if (boundary < 0) continue;

            if (!retried && isRepeatedOpener(buffer.slice(0, boundary), bannedOpeners)) {
              retried = true;
              await result.response.body?.cancel().catch(() => undefined);
              try {
                result = await call(true);
                restart = true;
                break;
              } catch {
                // The retry could not even start - a repeated opener beats no
                // reply at all, so fall through and send what we have.
              }
            }

            flushed = true;
            controller.enqueue(encoder.encode(buffer));
          }

          if (restart) continue;
          // A reply shorter than one sentence never reaches the boundary check.
          if (!flushed && buffer) controller.enqueue(encoder.encode(buffer));
          break;
        }
      } catch {
        // Mid-stream failure: the client keeps the partial text and offers a
        // retry, so ending quietly is better than injecting an error marker
        // into the middle of the character's line.
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Z4-Provider": result.provider,
      "X-Z4-Model": result.model,
    },
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
