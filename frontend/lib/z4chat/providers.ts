/**
 * Z4chat AI provider registry. SERVER ONLY - reads API keys from env.
 *
 * Every provider here exposes an OpenAI-compatible `/chat/completions`
 * endpoint, so one adapter covers all of them. Adding a provider means adding
 * a row below; making one live means pasting its key into .env.local.
 */

export type ProviderId = "openrouter" | "gemini" | "groq" | "deepseek" | "openai";

type ProviderDef = {
  id: ProviderId;
  label: string;
  baseUrl: string;
  envKeys: string[];
  models: Array<{ id: string; label: string }>;
  /**
   * Guards against a key that is present but obviously belongs to a different
   * provider - the repo currently has an OpenRouter key sitting in
   * OPENAI_API_KEY, which would otherwise show up as a working OpenAI provider
   * and fail on first use.
   */
  isPlausibleKey?: (key: string) => boolean;
  headers?: (key: string) => Record<string, string>;
};

const openRouterHeaders = (): Record<string, string> => ({
  "HTTP-Referer": process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  "X-Title": process.env.OPENROUTER_SITE_NAME || "Z4rum",
});

const PROVIDERS: ProviderDef[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    envKeys: ["OPENROUTER_API_KEY"],
    headers: openRouterHeaders,
    models: [
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
      { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    // Google's OpenAI-compatibility layer.
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    envKeys: ["GROQ_API_KEY"],
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (nhanh)" },
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    envKeys: ["DEEPSEEK_API_KEY"],
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    envKeys: ["OPENAI_API_KEY"],
    isPlausibleKey: (key) => !key.startsWith("sk-or-"),
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4o", label: "GPT-4o" },
    ],
  },
];

const keyFor = (def: ProviderDef): string | null => {
  for (const envKey of def.envKeys) {
    const value = (process.env[envKey] || "").trim();
    if (value && (!def.isPlausibleKey || def.isPlausibleKey(value))) return value;
  }
  return null;
};

export const DEFAULT_PROVIDER: ProviderId = "openrouter";
export const DEFAULT_MODEL = "openai/gpt-4o-mini";

/** Provider list for the UI: which ones have a usable key, and their models. */
export function listProviders() {
  return PROVIDERS.map((def) => ({
    id: def.id,
    label: def.label,
    available: Boolean(keyFor(def)),
    models: def.models,
  }));
}

/**
 * Providers to try, in order: the caller's pick first, then every other
 * configured provider as a fallback. This is what turns "lỗi char" into a
 * transparent retry instead of a dead end.
 */
export function resolveChain(preferred?: string): ProviderDef[] {
  const configured = PROVIDERS.filter((def) => keyFor(def));
  const first = configured.filter((def) => def.id === preferred);
  const rest = configured.filter((def) => def.id !== preferred);
  return [...first, ...rest];
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type CallOptions = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  timeoutMs?: number;
  /** Ask for a JSON object back (character/story drafts, summaries). */
  json?: boolean;
};

export class ProviderError extends Error {
  status: number;
  provider: string;

  constructor(provider: string, status: number, message: string) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.status = status;
  }
}

/** Model id to use for `def` - the caller's choice when it makes sense, else its default. */
function pickModel(def: ProviderDef, requested: string | undefined, isPreferred: boolean): string {
  if (!requested) return def.models[0].id;
  if (def.models.some((model) => model.id === requested)) return requested;
  // An id the registry does not know is still worth trying on the provider the
  // caller actually chose - these lists go stale and the UI lets people type a
  // custom id. On a failover provider that id would be meaningless, so use its
  // own default instead.
  return isPreferred ? requested : def.models[0].id;
}

async function callOne(def: ProviderDef, model: string, options: CallOptions): Promise<Response> {
  const key = keyFor(def);
  if (!key) throw new ProviderError(def.id, 500, `Thiếu API key cho ${def.label}`);

  const response = await fetch(`${def.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(def.headers ? def.headers(key) : {}),
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.9,
      max_tokens: options.maxTokens ?? 700,
      frequency_penalty: options.frequencyPenalty ?? 0.6,
      presence_penalty: options.presencePenalty ?? 0.5,
      ...(options.stream ? { stream: true } : {}),
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: any) => body?.error?.message || body?.message)
      .catch(() => null);
    throw new ProviderError(def.id, response.status, detail || `${def.label} trả về lỗi ${response.status}`);
  }

  return response;
}

export type CallResult = { response: Response; provider: ProviderId; model: string };

/**
 * Call the first provider that answers. Failing over on 4xx would be pointless
 * for a malformed request, but a bad/exhausted key also shows up as 401/402/429
 * - so we retry on everything except 400, which is genuinely our bug.
 */
export async function callChat(preferred: string | undefined, options: CallOptions): Promise<CallResult> {
  const chain = resolveChain(preferred);
  if (!chain.length) {
    throw new ProviderError(
      "none",
      500,
      "Chưa cấu hình API key nào. Thêm OPENROUTER_API_KEY (hoặc GEMINI/GROQ/DEEPSEEK) vào .env.local."
    );
  }

  let lastError: unknown;
  for (const def of chain) {
    const model = pickModel(def, options.model, def.id === preferred);
    try {
      const response = await callOne(def, model, options);
      return { response, provider: def.id, model };
    } catch (error) {
      lastError = error;
      if (error instanceof ProviderError && error.status === 400) throw error;
    }
  }

  if (lastError instanceof ProviderError) throw lastError;
  throw new ProviderError("none", 502, "Không kết nối được tới dịch vụ AI");
}

/** Non-streaming call, returns the assistant text. */
export async function chatText(preferred: string | undefined, options: CallOptions): Promise<string> {
  const { response } = await callChat(preferred, { ...options, stream: false });
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (data.choices?.[0]?.message?.content || "").trim();
}

/**
 * Text deltas out of an already-open streaming response. Parses the OpenAI SSE
 * wire format, which all five providers speak. Split out from `streamChat` so a
 * caller that needs to inspect the reply mid-flight - and possibly abandon it and
 * call again - can drive the read itself.
 */
export async function* streamDeltas(response: Response): AsyncGenerator<string, void, unknown> {
  const body = response.body;
  if (!body) throw new ProviderError("none", 502, "Dịch vụ AI không trả về dữ liệu");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line; keep the trailing partial.
    const events = buffer.split("\n");
    buffer = events.pop() ?? "";

    for (const line of events) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // Partial or non-JSON keep-alive frame - ignore and keep reading.
      }
    }
  }
}

/** Streaming call, yields text deltas. */
export async function* streamChat(
  preferred: string | undefined,
  options: CallOptions
): AsyncGenerator<string, void, unknown> {
  const { response } = await callChat(preferred, { ...options, stream: true });
  yield* streamDeltas(response);
}
