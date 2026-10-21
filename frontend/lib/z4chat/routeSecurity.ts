import { NextRequest, NextResponse } from "next/server";

type AuthUser = { id: string };
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 64 * 1024;

const limits: Record<string, number> = {
  models: 60,
  chat: 20,
  generate: 10,
  summarize: 12,
  proactive: 10,
};

function backendUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");
}

/** Authenticate against the canonical Express API, then apply a per-user route limit. */
export async function protectAiRoute(
  req: NextRequest,
  action: keyof typeof limits
): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { response: NextResponse.json({ error: "Bạn phải đăng nhập để dùng AI" }, { status: 401 }) };
  }

  let user: AuthUser;
  try {
    const response = await fetch(`${backendUrl()}/auth/me`, {
      headers: { authorization },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return { response: NextResponse.json({ error: "Phiên đăng nhập không hợp lệ" }, { status: 401 }) };
    }
    const value: unknown = await response.json();
    if (!value || typeof value !== "object" || typeof (value as AuthUser).id !== "string") {
      return { response: NextResponse.json({ error: "Không xác minh được tài khoản" }, { status: 401 }) };
    }
    user = value as AuthUser;
  } catch {
    return { response: NextResponse.json({ error: "Không thể xác minh đăng nhập" }, { status: 503 }) };
  }

  const now = Date.now();
  if (buckets.size > 5_000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }
  const key = `${action}:${user.id}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > limits[action]) {
    return {
      response: NextResponse.json(
        { error: "Bạn đang gửi quá nhiều yêu cầu AI. Hãy thử lại sau một phút." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)) } }
      ),
    };
  }

  return { user };
}

/** Read JSON with a hard byte cap even when Content-Length is absent. */
export async function readLimitedJson(req: NextRequest): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new RequestBodyError(413, "Dữ liệu gửi lên quá lớn");

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new RequestBodyError(413, "Dữ liệu gửi lên quá lớn");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestBodyError(400, "Body không phải JSON");
  }
}

export class RequestBodyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function bodyErrorResponse(error: unknown): NextResponse {
  if (error instanceof RequestBodyError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
}
