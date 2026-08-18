import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ChatRole = "user" | "assistant";

type IncomingHistoryItem = {
  role?: string;
  content?: string;
};

type IncomingPersona = {
  id?: string;
  name?: string;
  stylePrompt?: string;
};

type IncomingScenario = {
  id?: string;
  name?: string;
  scenePrompt?: string;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const SYSTEM_PROMPT =
  "Ban la mot tro ly than thien, tra loi ngan gon, de hieu, uu tien tieng Viet va giu giong hoi thoai nhe nhang.";

const DEFAULT_PERSONA: Required<IncomingPersona> = {
  id: "warm-friend",
  name: "Ban than am ap",
  stylePrompt: "Lang nghe, dong cam, hoi mo va dong vien nguoi dung.",
};

const DEFAULT_SCENARIO: Required<IncomingScenario> = {
  id: "casual-chat",
  name: "Tro chuyen tu do",
  scenePrompt: "Hoi thoai tu nhien, nhe nhang, khong can qua formal.",
};

const MAX_HISTORY_ITEMS = 12;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "Missing OPENROUTER_API_KEY" }, { status: 500 });
  }

  const siteUrl = process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const siteName = process.env.OPENROUTER_SITE_NAME || "Z4rum";

  let body: {
    message?: string;
    history?: IncomingHistoryItem[];
    persona?: IncomingPersona;
    scenario?: IncomingScenario;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const message = (body.message || "").trim();
  if (!message) {
    return NextResponse.json({ message: "Message is required" }, { status: 400 });
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is Required<IncomingHistoryItem> =>
            (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim().length > 0
        )
        .slice(-MAX_HISTORY_ITEMS)
        .map((item) => ({ role: item.role as ChatRole, content: item.content.trim() }))
    : [];

  const persona: Required<IncomingPersona> = {
    id: (body.persona?.id || DEFAULT_PERSONA.id).trim(),
    name: (body.persona?.name || DEFAULT_PERSONA.name).trim(),
    stylePrompt: (body.persona?.stylePrompt || DEFAULT_PERSONA.stylePrompt).trim(),
  };

  const scenario: Required<IncomingScenario> = {
    id: (body.scenario?.id || DEFAULT_SCENARIO.id).trim(),
    name: (body.scenario?.name || DEFAULT_SCENARIO.name).trim(),
    scenePrompt: (body.scenario?.scenePrompt || DEFAULT_SCENARIO.scenePrompt).trim(),
  };

  const rolePrompt = [
    SYSTEM_PROMPT,
    `Ban dang dong vai: ${persona.name} (${persona.id}).`,
    `Phong cach can giu: ${persona.stylePrompt}`,
    `Kich ban hien tai: ${scenario.name} (${scenario.id}).`,
    `Boi canh hoi thoai: ${scenario.scenePrompt}`,
    "Giu tinh nhat quan vai tro qua nhieu luot hoi thoai.",
    "Neu nguoi dung yeu cau goi y giao tiep, dua ra vi du cau noi cu the va ngan gon.",
  ].join("\n");

  try {
    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": siteUrl,
        "X-Title": siteName,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: rolePrompt },
          ...history,
          { role: "user", content: message },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
      cache: "no-store",
    });

    const data = (await openRouterResponse.json()) as OpenRouterResponse;

    if (!openRouterResponse.ok) {
      return NextResponse.json(
        { message: data.error?.message || "OpenRouter request failed" },
        { status: openRouterResponse.status || 502 }
      );
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ message: "Empty AI response" }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ message: "AI service unavailable" }, { status: 502 });
  }
}
