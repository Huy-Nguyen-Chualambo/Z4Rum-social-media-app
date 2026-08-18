import { axiosClient } from "./axiosClient";
import type {
  Z4Character,
  Z4ChatContext,
  Z4Memory,
  Z4Message,
  Z4ProactiveCandidate,
  Z4ProviderInfo,
  Z4Session,
  Z4SessionSummary,
  Z4Story,
} from "@/lib/z4chat/types";

export type CharacterInput = {
  name: string;
  description: string;
  greeting: string;
  avatarUrl?: string;
  tagline?: string;
  personality?: string;
  speechStyle?: string;
  exampleDialog?: string;
  likes?: string;
  dislikes?: string;
  tags?: string[];
  isPublic?: boolean;
  proactive?: boolean;
  clinginess?: number;
};

export type StoryInput = {
  title: string;
  synopsis?: string;
  worldSetting?: string;
  plotOutline?: string;
  userRoleName?: string;
  userRoleDesc?: string;
  openingScene?: string;
  tags?: string[];
  isPublic?: boolean;
};

/** Persistence goes to the Express backend; anything AI goes to /api/z4chat/*. */
export const z4chatApi = {
  characters: {
    list: (scope: "all" | "mine" | "public" = "all") =>
      axiosClient.get<Z4Character[]>("/z4chat/characters", { params: { scope } }).then((r) => r.data),
    get: (id: string) => axiosClient.get<Z4Character>(`/z4chat/characters/${id}`).then((r) => r.data),
    create: (data: CharacterInput) =>
      axiosClient.post<Z4Character>("/z4chat/characters", data).then((r) => r.data),
    update: (id: string, data: Partial<CharacterInput>) =>
      axiosClient.put<Z4Character>(`/z4chat/characters/${id}`, data).then((r) => r.data),
    remove: (id: string) => axiosClient.delete(`/z4chat/characters/${id}`).then((r) => r.data),
  },

  stories: {
    list: (scope: "all" | "mine" | "public" = "all") =>
      axiosClient.get<Z4Story[]>("/z4chat/stories", { params: { scope } }).then((r) => r.data),
    get: (id: string) => axiosClient.get<Z4Story>(`/z4chat/stories/${id}`).then((r) => r.data),
    create: (data: StoryInput) => axiosClient.post<Z4Story>("/z4chat/stories", data).then((r) => r.data),
    update: (id: string, data: Partial<StoryInput>) =>
      axiosClient.put<Z4Story>(`/z4chat/stories/${id}`, data).then((r) => r.data),
    remove: (id: string) => axiosClient.delete(`/z4chat/stories/${id}`).then((r) => r.data),
  },

  sessions: {
    list: () => axiosClient.get<Z4SessionSummary[]>("/z4chat/sessions").then((r) => r.data),
    get: (id: string) => axiosClient.get<Z4Session>(`/z4chat/sessions/${id}`).then((r) => r.data),
    create: (data: { characterId: string; storyId?: string; provider?: string; model?: string }) =>
      axiosClient.post<Z4Session>("/z4chat/sessions", data).then((r) => r.data),
    remove: (id: string) => axiosClient.delete(`/z4chat/sessions/${id}`).then((r) => r.data),

    addMessage: (id: string, data: { role: "user" | "assistant"; content: string; kind?: string }) =>
      axiosClient.post<Z4Message>(`/z4chat/sessions/${id}/messages`, data).then((r) => r.data),
    editMessage: (id: string, messageId: string, content: string) =>
      axiosClient.put<Z4Message>(`/z4chat/sessions/${id}/messages/${messageId}`, { content }).then((r) => r.data),
    removeMessage: (id: string, messageId: string) =>
      axiosClient.delete(`/z4chat/sessions/${id}/messages/${messageId}`).then((r) => r.data),

    markSeen: (id: string) =>
      axiosClient
        .post<{ id: string; lastSeenAt: string; unreadCount: number }>(`/z4chat/sessions/${id}/seen`)
        .then((r) => r.data),
    saveSummary: (id: string, data: { summary: string; summarizedUpTo: number; facts?: string[] }) =>
      axiosClient.put<Z4Session>(`/z4chat/sessions/${id}/summary`, data).then((r) => r.data),
    setModel: (id: string, data: { provider: string; model: string }) =>
      axiosClient.put<{ id: string; provider: string; model: string }>(`/z4chat/sessions/${id}/model`, data).then((r) => r.data),
    addProactive: (id: string, content: string) =>
      axiosClient.post<Z4Message>(`/z4chat/sessions/${id}/proactive`, { content }).then((r) => r.data),
  },

  memories: {
    list: (sessionId: string) =>
      axiosClient.get<Z4Memory[]>(`/z4chat/sessions/${sessionId}/memories`).then((r) => r.data),
    create: (sessionId: string, content: string) =>
      axiosClient.post<Z4Memory>(`/z4chat/sessions/${sessionId}/memories`, { content }).then((r) => r.data),
    update: (sessionId: string, memoryId: string, data: { content?: string; pinned?: boolean }) =>
      axiosClient.put<Z4Memory>(`/z4chat/sessions/${sessionId}/memories/${memoryId}`, data).then((r) => r.data),
    remove: (sessionId: string, memoryId: string) =>
      axiosClient.delete(`/z4chat/sessions/${sessionId}/memories/${memoryId}`).then((r) => r.data),
  },

  unread: () => axiosClient.get<{ total: number; sessions: number }>("/z4chat/unread").then((r) => r.data),
  proactiveDue: () => axiosClient.get<Z4ProactiveCandidate[]>("/z4chat/proactive/due").then((r) => r.data),
};

// ---------------------------------------------------------------------------
// AI endpoints - Next.js routes, so the API keys stay server-side.
// ---------------------------------------------------------------------------

export type ModelsResponse = {
  providers: Z4ProviderInfo[];
  defaultProvider: string | null;
  defaultModel: string | null;
  ready: boolean;
};

/** Error text out of a Next route, which answers `{ error }` on failure. */
async function routeError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return (body as { error?: string } | null)?.error || fallback;
}

export const z4chatAi = {
  models: async (): Promise<ModelsResponse> => {
    const res = await fetch("/api/z4chat/models", { cache: "no-store" });
    if (!res.ok) throw new Error(await routeError(res, "Không đọc được danh sách model"));
    return res.json();
  },

  /**
   * Stream one reply. `onDelta` fires per chunk so the bubble fills in as the
   * text arrives; the resolved string is the whole reply.
   */
  chat: async (
    payload: Z4ChatContext & { turn?: number },
    onDelta: (delta: string) => void,
    signal?: AbortSignal
  ): Promise<{ text: string; provider: string | null; model: string | null }> => {
    const res = await fetch("/api/z4chat/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok || !res.body) throw new Error(await routeError(res, "Nhân vật chưa trả lời được"));

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;
      text += chunk;
      onDelta(chunk);
    }

    return {
      text: text.trim(),
      provider: res.headers.get("X-Z4-Provider"),
      model: res.headers.get("X-Z4-Model"),
    };
  },

  summarize: async (payload: {
    messages: Array<{ role: string; content: string }>;
    previousSummary?: string | null;
    characterName?: string;
    provider?: string;
    model?: string;
  }): Promise<{ summary: string; facts: string[] }> => {
    const res = await fetch("/api/z4chat/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await routeError(res, "Không nén được ký ức"));
    return res.json();
  },

  generate: async (payload: { kind: "character" | "story"; brief: string; provider?: string; model?: string }) => {
    const res = await fetch("/api/z4chat/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await routeError(res, "Không tạo được bản nháp"));
    return res.json() as Promise<Record<string, string | string[]>>;
  },

  proactive: async (payload: Z4ChatContext & { slotPrompt: string }): Promise<{ content: string }> => {
    const res = await fetch("/api/z4chat/proactive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await routeError(res, "Không tạo được tin nhắn"));
    return res.json();
  },
};
