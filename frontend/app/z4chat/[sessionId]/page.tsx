"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Brain, Cpu, Loader2, RefreshCw } from "lucide-react";
import RequireAuth from "../../_components/RequireAuth";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useZ4chatStore } from "@/lib/store/useZ4chatStore";
import { useToast } from "@/lib/ui/toast";
import { z4chatAi, z4chatApi } from "@/lib/api/z4chatApi";
import { maxSimilarity, REPEAT_SIMILARITY_THRESHOLD } from "@/lib/z4chat/antiRepeat";
import type { Z4ChatContext, Z4Memory, Z4Message, Z4Session } from "@/lib/z4chat/types";
import ChatBubble from "../_components/ChatBubble";
import ChatComposer from "../_components/ChatComposer";
import MemoryPanel from "../_components/MemoryPanel";
import ModelPicker from "../_components/ModelPicker";

const FALLBACK_AVATAR = "https://avatars.githubusercontent.com/u/0?v=4";

/** Turns sent verbatim with each request - tier 3 of the memory stack. */
const HISTORY_TURNS = 24;

/** Turns kept out of the summary so the recent scene is always word-for-word. */
const VERBATIM_KEEP = 20;

/** How many un-summarized turns pile up before we compact. */
const COMPACT_AFTER = 30;

/** Replies compared against a new one for the after-the-fact repetition nudge. */
const COMPARE_REPLIES = 5;

export default function Z4chatSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId as string;
  const router = useRouter();
  const { push } = useToast();
  const { token } = useAuthStore();
  const clearUnreadFor = useZ4chatStore((state) => state.clearUnreadFor);
  const setDraft = useZ4chatStore((state) => state.setDraft);
  const clearDraft = useZ4chatStore((state) => state.clearDraft);

  const [session, setSession] = useState<Z4Session | null>(null);
  const [messages, setMessages] = useState<Z4Message[]>([]);
  const [memories, setMemories] = useState<Z4Memory[]>([]);
  /** Absolute index of messages[0], since the API only returns a tail. */
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [streamText, setStreamText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repeatIds, setRepeatIds] = useState<string[]>([]);
  const [compacting, setCompacting] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const messagesRef = useRef<Z4Message[]>([]);
  const streamedRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const compactingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // --- load -----------------------------------------------------------------

  useEffect(() => {
    if (!token || !sessionId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await z4chatApi.sessions.get(sessionId);
        if (cancelled) return;

        setSession(data);
        setMessages(data.messages);
        setMemories(data.memories);
        setOffset(Math.max(0, (data._count?.messages ?? data.messages.length) - data.messages.length));

        if (data.unreadCount > 0) clearUnreadFor(data.id, data.unreadCount);
        // Also resets the silence clock, so a character never nudges someone who
        // is sitting in the conversation right now.
        z4chatApi.sessions.markSeen(data.id).catch(() => undefined);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, sessionId, clearUnreadFor]);

  // Abandon an in-flight reply if the page goes away.
  useEffect(() => () => abortRef.current?.abort(), []);

  // --- scrolling ------------------------------------------------------------

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    atBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
  };

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !atBottomRef.current) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, streamText, loading]);

  // --- one turn -------------------------------------------------------------

  const buildContext = useCallback(
    (history: Z4Message[]): Z4ChatContext & { turn: number } => ({
      character: session!.character,
      story: session!.story ?? null,
      summary: session!.summary ?? null,
      memories: memories.filter((memory) => memory.pinned).map((memory) => ({ content: memory.content })),
      history: history.slice(-HISTORY_TURNS).map((message) => ({ role: message.role, content: message.content })),
      provider: session!.provider,
      model: session!.model,
      turn: offset + history.length,
    }),
    [session, memories, offset]
  );

  /**
   * Fold everything older than the verbatim window into the rolling summary.
   * Runs after a turn, quietly - a failure here degrades memory, it should not
   * interrupt the conversation.
   */
  const compact = useCallback(
    async (force = false) => {
      if (!session || compactingRef.current) return;

      const all = messagesRef.current;
      const from = Math.max(0, session.summarizedUpTo - offset);
      const to = force ? all.length - 4 : offset + all.length - VERBATIM_KEEP - offset;

      if (to - from < 2) {
        if (force) push("Hội thoại còn quá ngắn để nén", "info");
        return;
      }
      if (!force && offset + to - session.summarizedUpTo < COMPACT_AFTER) return;

      const chunk = all.slice(from, to);
      compactingRef.current = true;
      setCompacting(true);

      try {
        const { summary, facts } = await z4chatAi.summarize({
          messages: chunk.map((message) => ({ role: message.role, content: message.content })),
          previousSummary: session.summary,
          characterName: session.character.name,
          provider: session.provider,
          model: session.model,
        });

        const updated = await z4chatApi.sessions.saveSummary(session.id, {
          summary,
          summarizedUpTo: offset + to,
          facts,
        });

        setSession((prev) =>
          prev ? { ...prev, summary: updated.summary, summarizedUpTo: updated.summarizedUpTo } : prev
        );
        if (updated.memories) setMemories(updated.memories);
        if (force) push("Đã nén ký ức", "success");
      } catch (err: any) {
        if (force) push(err?.message || "Không nén được ký ức", "error");
      } finally {
        compactingRef.current = false;
        setCompacting(false);
      }
    },
    [session, offset, push]
  );

  const runTurn = useCallback(
    async (history: Z4Message[]) => {
      if (!session) return;

      setError(null);
      setPending(true);
      setStreamText("");
      streamedRef.current = "";

      const controller = new AbortController();
      abortRef.current = controller;

      const persist = async (content: string) => {
        const saved = await z4chatApi.sessions.addMessage(session.id, { role: "assistant", content });
        setMessages((prev) => [...prev, saved]);
        return saved;
      };

      try {
        const { text } = await z4chatAi.chat(
          buildContext(history),
          (delta) => {
            streamedRef.current += delta;
            setStreamText(streamedRef.current);
          },
          controller.signal
        );

        if (!text) throw new Error("Nhân vật không trả lời gì cả. Thử lại nhé.");

        const saved = await persist(text);

        // Layer 4 of the anti-repetition stack: flag, never silently rewrite.
        // The prompt ban list and the opener guard already ran server-side; what
        // slips past those is a judgement call, so it goes to the user.
        const previous = history
          .filter((message) => message.role === "assistant")
          .slice(-COMPARE_REPLIES)
          .map((message) => message.content);

        if (maxSimilarity(text, previous) >= REPEAT_SIMILARITY_THRESHOLD) {
          setRepeatIds((prev) => [...prev, saved.id]);
        }
      } catch (err: any) {
        const partial = streamedRef.current.trim();

        if (err?.name === "AbortError" || err?.name === "CanceledError") {
          // Stopped on purpose - keep what the character managed to say.
          if (partial) await persist(partial).catch(() => undefined);
        } else {
          setError(err?.message || "Nhân vật chưa trả lời được");
        }
      } finally {
        abortRef.current = null;
        setStreamText(null);
        streamedRef.current = "";
        setPending(false);
        compact();
      }
    },
    [session, buildContext, compact]
  );

  // --- actions --------------------------------------------------------------

  const handleSend = async (text: string) => {
    if (!session || pending) return;

    const base = messagesRef.current;
    const temp: Z4Message = {
      id: `temp-${base.length}-${text.length}`,
      sessionId: session.id,
      role: "user",
      content: text,
      kind: "normal",
      createdAt: new Date().toISOString(),
    };

    clearDraft(session.id);
    setError(null);
    setMessages([...base, temp]);
    setPending(true);
    atBottomRef.current = true;

    let saved: Z4Message;
    try {
      saved = await z4chatApi.sessions.addMessage(session.id, { role: "user", content: text });
    } catch (err: any) {
      // Hand the text back rather than losing it.
      setMessages(base);
      setDraft(session.id, text);
      setError(err?.response?.data?.error || "Không gửi được tin nhắn. Thử lại nhé.");
      setPending(false);
      return;
    }

    setMessages([...base, saved]);
    await runTurn([...base, saved]);
  };

  /** After a failure: the user's message is already stored, so just ask again. */
  const handleRetry = () => {
    const history = messagesRef.current;
    if (!history.length) return;
    runTurn(history);
  };

  const handleRegenerate = async (message: Z4Message) => {
    if (!session || pending) return;

    const index = messagesRef.current.findIndex((item) => item.id === message.id);
    if (index < 0) return;
    const trimmed = messagesRef.current.slice(0, index);

    try {
      await z4chatApi.sessions.removeMessage(session.id, message.id);
    } catch (err: any) {
      push(err?.response?.data?.error || "Không xoá được câu trả lời cũ", "error");
      return;
    }

    setRepeatIds((prev) => prev.filter((id) => id !== message.id));
    setMessages(trimmed);
    await runTurn(trimmed);
  };

  const handleEdit = async (message: Z4Message, content: string) => {
    if (!session) return;
    try {
      const updated = await z4chatApi.sessions.editMessage(session.id, message.id, content);
      setMessages((prev) => prev.map((item) => (item.id === message.id ? updated : item)));
    } catch (err: any) {
      push(err?.response?.data?.error || "Không sửa được tin nhắn", "error");
    }
  };

  const handleDelete = async (message: Z4Message) => {
    if (!session) return;
    try {
      await z4chatApi.sessions.removeMessage(session.id, message.id);
      setMessages((prev) => prev.filter((item) => item.id !== message.id));
    } catch (err: any) {
      push(err?.response?.data?.error || "Không xoá được tin nhắn", "error");
    }
  };

  const handlePickModel = async (provider: string, model: string) => {
    if (!session) return;
    setSession((prev) => (prev ? { ...prev, provider, model } : prev));
    try {
      await z4chatApi.sessions.setModel(session.id, { provider, model });
    } catch (err: any) {
      push(err?.response?.data?.error || "Không lưu được lựa chọn model", "error");
    }
  };

  // --- render ---------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen">
        <RequireAuth />
        <div className="flex items-center justify-center gap-2 py-24 text-[#64748b] text-sm">
          <Loader2 size={18} className="animate-spin" />
          Đang mở cuộc trò chuyện…
        </div>
      </div>
    );
  }

  if (failed || !session) {
    return (
      <div className="min-h-screen">
        <RequireAuth />
        <div className="flex flex-col items-center text-center py-20">
          <div className="p-3.5 rounded-2xl bg-[#1e293b] border border-[#334155] mb-4">
            <AlertTriangle size={22} className="text-[#fbbf24]" />
          </div>
          <h2 className="text-white font-bold mb-2">Không mở được cuộc trò chuyện này</h2>
          <p className="text-[#94a3b8] text-[13px] max-w-sm">
            Có thể nó đã bị xoá, hoặc không thuộc về tài khoản đang đăng nhập.
          </p>
          <button
            onClick={() => router.push("/z4chat")}
            className="mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white text-sm font-bold"
          >
            Về Z4chat
          </button>
        </div>
      </div>
    );
  }

  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;

  return (
    <div className="min-h-screen">
      <RequireAuth />

      <div className="flex flex-col h-[75dvh] min-h-[440px] bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-3xl overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-3 sm:px-4 py-3 border-b border-[#1e3a52] shrink-0">
          <Link
            href="/z4chat"
            className="p-2 rounded-xl text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-colors shrink-0"
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} />
          </Link>

          <img
            src={session.character.avatarUrl || FALLBACK_AVATAR}
            alt={session.character.name}
            className="w-10 h-10 rounded-xl object-cover ring-1 ring-[#1e3a52] shrink-0"
          />

          <div className="min-w-0 flex-1">
            <h1 className="text-white font-bold truncate leading-tight">{session.character.name}</h1>
            <p className="text-[#64748b] text-xs truncate">
              {session.story ? session.story.title : session.character.tagline || "Trò chuyện tự do"}
            </p>
          </div>

          <button
            onClick={() => setMemoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#1e3a52] text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-colors shrink-0"
            title="Xem và sửa những gì nhân vật đang nhớ"
          >
            {compacting ? <Loader2 size={15} className="animate-spin" /> : <Brain size={15} />}
            <span className="hidden sm:inline text-xs font-bold">Đang nhớ gì?</span>
          </button>

          <button
            onClick={() => setModelOpen(true)}
            className="p-2 rounded-xl border border-[#1e3a52] text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-colors shrink-0"
            title={`AI đang dùng: ${session.provider} · ${session.model}`}
            aria-label="Chọn AI"
          >
            <Cpu size={15} />
          </button>
        </div>

        {/* messages */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4">
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              characterName={session.character.name}
              avatarUrl={session.character.avatarUrl}
              canRegenerate={message.id === lastAssistantId && !pending}
              repeatWarning={repeatIds.includes(message.id)}
              onRegenerate={message.role === "assistant" ? () => handleRegenerate(message) : undefined}
              onEdit={message.id.startsWith("temp-") ? undefined : (content) => handleEdit(message, content)}
              onDelete={message.id.startsWith("temp-") ? undefined : () => handleDelete(message)}
            />
          ))}

          {streamText !== null && (
            <ChatBubble
              message={{
                id: "streaming",
                sessionId: session.id,
                role: "assistant",
                content: streamText || "…",
                kind: "normal",
                createdAt: new Date().toISOString(),
              }}
              characterName={session.character.name}
              avatarUrl={session.character.avatarUrl}
              streaming
            />
          )}
        </div>

        {/* A failed reply never eats the turn: the message stays, the draft stays,
            and asking again is one tap. */}
        {error && (
          <div className="flex items-center gap-3 mx-3 sm:mx-4 mb-2 px-4 py-3 rounded-2xl bg-[#f87171]/10 border border-[#f87171]/30 shrink-0">
            <AlertTriangle size={16} className="text-[#f87171] shrink-0" />
            <p className="flex-1 min-w-0 text-[#fca5a5] text-[13px] leading-snug">{error}</p>
            <button
              onClick={handleRetry}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f87171]/15 border border-[#f87171]/30 text-[#fca5a5] text-xs font-bold hover:bg-[#f87171]/25 disabled:opacity-40 shrink-0"
            >
              <RefreshCw size={12} />
              Thử lại
            </button>
          </div>
        )}

        <ChatComposer
          sessionId={session.id}
          characterName={session.character.name}
          streaming={streamText !== null}
          disabled={pending && streamText === null}
          onSend={handleSend}
          onStop={() => abortRef.current?.abort()}
        />
      </div>

      <MemoryPanel
        open={memoryOpen}
        session={session}
        memories={memories}
        verbatimCount={Math.min(HISTORY_TURNS, messages.length)}
        compacting={compacting}
        onClose={() => setMemoryOpen(false)}
        onMemoriesChange={setMemories}
        onCompactNow={() => compact(true)}
      />

      <ModelPicker
        open={modelOpen}
        provider={session.provider}
        model={session.model}
        onClose={() => setModelOpen(false)}
        onPick={handlePickModel}
      />
    </div>
  );
}
