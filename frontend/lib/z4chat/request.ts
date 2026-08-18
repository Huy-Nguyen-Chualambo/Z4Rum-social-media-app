/**
 * Shared request handling for the Z4chat AI routes. SERVER ONLY.
 *
 * The client sends structured context, never a finished prompt, so everything
 * that arrives has to be re-checked and clamped here before it reaches a model.
 */

import { NextResponse } from "next/server";
import { ProviderError } from "./providers";
import type { Z4ChatContext, Z4Character, Z4Story } from "./types";

/** Verbatim turns kept in the prompt - tier 3 of the memory stack. */
export const MAX_HISTORY = 40;

/** How many recent replies the anti-repetition pass looks at. */
export const RECENT_REPLIES = 6;

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const nullable = (value: unknown, max: number): string | null => text(value, max) || null;

/**
 * Rebuild the character sheet from whatever arrived. Only `name` is required:
 * a half-filled sheet still role-plays, a nameless one cannot.
 */
function character(raw: any): Z4Character | null {
  const name = text(raw?.name, 60);
  if (!name) return null;

  return {
    id: text(raw?.id, 64),
    ownerId: "",
    name,
    avatarUrl: nullable(raw?.avatarUrl, 500),
    tagline: nullable(raw?.tagline, 160),
    description: text(raw?.description, 4000),
    personality: nullable(raw?.personality, 2000),
    speechStyle: nullable(raw?.speechStyle, 2000),
    greeting: text(raw?.greeting, 2000),
    exampleDialog: nullable(raw?.exampleDialog, 4000),
    likes: nullable(raw?.likes, 500),
    dislikes: nullable(raw?.dislikes, 500),
    tags: [],
    isPublic: false,
    proactive: Boolean(raw?.proactive),
    clinginess: Math.min(3, Math.max(1, Number(raw?.clinginess) || 2)),
    createdAt: "",
    updatedAt: "",
  };
}

function story(raw: any): Z4Story | null {
  const title = text(raw?.title, 120);
  if (!title) return null;

  return {
    id: text(raw?.id, 64),
    ownerId: "",
    title,
    synopsis: nullable(raw?.synopsis, 2000),
    worldSetting: nullable(raw?.worldSetting, 4000),
    plotOutline: nullable(raw?.plotOutline, 4000),
    userRoleName: nullable(raw?.userRoleName, 60),
    userRoleDesc: nullable(raw?.userRoleDesc, 2000),
    openingScene: nullable(raw?.openingScene, 2000),
    tags: [],
    isPublic: false,
    createdAt: "",
    updatedAt: "",
  };
}

export function normalizeContext(raw: any): Z4ChatContext | null {
  const sheet = character(raw?.character);
  if (!sheet) return null;

  const history = Array.isArray(raw?.history)
    ? raw.history
        .map((item: any) => ({
          role: item?.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: text(item?.content, 8000),
        }))
        .filter((item: { content: string }) => item.content)
        .slice(-MAX_HISTORY)
    : [];

  const memories = Array.isArray(raw?.memories)
    ? raw.memories
        .map((item: any) => ({ content: text(item?.content, 300) }))
        .filter((item: { content: string }) => item.content)
        .slice(0, 40)
    : [];

  return {
    character: sheet,
    story: story(raw?.story),
    summary: nullable(raw?.summary, 8000),
    memories,
    history,
    provider: text(raw?.provider, 32) || undefined,
    model: text(raw?.model, 120) || undefined,
  };
}

/** Turn a provider failure into a Vietnamese message the chat bubble can show. */
export function providerErrorResponse(error: unknown): NextResponse {
  if (error instanceof ProviderError) {
    // 401/402/429 mean the key is the problem, not the request - say so plainly
    // instead of leaking the provider's own wording.
    const message =
      error.status === 401 || error.status === 403
        ? "API key không hợp lệ hoặc đã bị thu hồi."
        : error.status === 402
        ? "Tài khoản AI đã hết hạn mức."
        : error.status === 429
        ? "Đang bị giới hạn tốc độ, thử lại sau một chút."
        : error.message;
    return NextResponse.json({ error: message, provider: error.provider }, { status: error.status || 502 });
  }

  if (error instanceof Error && error.name === "TimeoutError") {
    return NextResponse.json({ error: "Dịch vụ AI phản hồi quá lâu." }, { status: 504 });
  }

  return NextResponse.json({ error: "Không gọi được dịch vụ AI." }, { status: 502 });
}

/**
 * Pull a JSON object out of a model reply. `response_format` is honoured by most
 * providers but not all, so a fenced block or a bare object in prose still has
 * to be recoverable.
 */
export function parseJsonReply<T>(reply: string): T | null {
  const candidates = [reply, reply.replace(/^```(?:json)?\s*|\s*```$/g, "")];

  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(reply.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.trim());
      if (parsed && typeof parsed === "object") return parsed as T;
    } catch {
      // Try the next shape.
    }
  }
  return null;
}
