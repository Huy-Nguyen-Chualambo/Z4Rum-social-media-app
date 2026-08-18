"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BookOpen, Loader2, MessageSquare, Plus, Sparkles, Users } from "lucide-react";
import RequireAuth from "../_components/RequireAuth";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useZ4chatStore } from "@/lib/store/useZ4chatStore";
import { useToast } from "@/lib/ui/toast";
import { z4chatAi, z4chatApi } from "@/lib/api/z4chatApi";
import type { Z4Character, Z4SessionSummary, Z4Story } from "@/lib/z4chat/types";
import CharacterCard from "./_components/CharacterCard";
import CharacterForm from "./_components/CharacterForm";
import SessionCard from "./_components/SessionCard";
import StartChatModal from "./_components/StartChatModal";
import StoryCard from "./_components/StoryCard";
import StoryForm from "./_components/StoryForm";

type Tab = "characters" | "stories" | "sessions";
type Scope = "mine" | "public";

const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
  { id: "characters", label: "Nhân vật", icon: Users },
  { id: "stories", label: "Cốt truyện", icon: BookOpen },
  { id: "sessions", label: "Đang chat", icon: MessageSquare },
];

export default function Z4chatHubPage() {
  const router = useRouter();
  const { push } = useToast();
  const { token, user } = useAuthStore();
  const unreadTotal = useZ4chatStore((state) => state.unreadTotal);
  const setUnread = useZ4chatStore((state) => state.setUnread);

  const [tab, setTab] = useState<Tab>("characters");
  const [scope, setScope] = useState<Scope>("mine");
  const [loading, setLoading] = useState(true);

  const [characters, setCharacters] = useState<Z4Character[]>([]);
  const [stories, setStories] = useState<Z4Story[]>([]);
  const [sessions, setSessions] = useState<Z4SessionSummary[]>([]);
  const [aiReady, setAiReady] = useState(true);

  const [characterForm, setCharacterForm] = useState<{ open: boolean; editing: Z4Character | null }>({
    open: false,
    editing: null,
  });
  const [storyForm, setStoryForm] = useState<{ open: boolean; editing: Z4Story | null }>({
    open: false,
    editing: null,
  });
  const [startFor, setStartFor] = useState<Z4Character | null>(null);
  const [starting, setStarting] = useState(false);

  // Land on the conversation list only for people who already have one going.
  const pickedInitialTab = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [characterList, storyList, sessionList] = await Promise.all([
        z4chatApi.characters.list("all"),
        z4chatApi.stories.list("all"),
        z4chatApi.sessions.list(),
      ]);
      setCharacters(characterList);
      setStories(storyList);
      setSessions(sessionList);
      setUnread(sessionList.reduce((sum, session) => sum + session.unreadCount, 0));

      if (!pickedInitialTab.current) {
        pickedInitialTab.current = true;
        if (sessionList.length) setTab("sessions");
      }
    } catch (error: any) {
      push(error?.response?.data?.error || "Không tải được Z4chat", "error");
    } finally {
      setLoading(false);
    }
  }, [push, setUnread]);

  useEffect(() => {
    if (!token) return;
    load();
    // A missing key is a setup problem, not an error - warn once, up front,
    // instead of letting the first reply fail.
    z4chatAi
      .models()
      .then((data) => setAiReady(data.ready))
      .catch(() => setAiReady(false));
  }, [token, load]);

  const mine = <T extends { ownerId: string }>(items: T[]) =>
    items.filter((item) => (scope === "mine" ? item.ownerId === user?.id : item.ownerId !== user?.id));

  const handleStart = async (storyId: string | null) => {
    if (!startFor) return;
    setStarting(true);
    try {
      const session = await z4chatApi.sessions.create({
        characterId: startFor.id,
        ...(storyId ? { storyId } : {}),
      });
      router.push(`/z4chat/${session.id}`);
    } catch (error: any) {
      push(error?.response?.data?.error || "Không mở được cuộc trò chuyện", "error");
      setStarting(false);
    }
  };

  const handleDeleteCharacter = async (character: Z4Character) => {
    if (!confirm(`Xoá "${character.name}"? Mọi cuộc trò chuyện với nhân vật này cũng mất luôn.`)) return;
    try {
      await z4chatApi.characters.remove(character.id);
      setCharacters((prev) => prev.filter((item) => item.id !== character.id));
      setSessions((prev) => prev.filter((item) => item.characterId !== character.id));
      push("Đã xoá nhân vật", "success");
    } catch (error: any) {
      push(error?.response?.data?.error || "Không xoá được nhân vật", "error");
    }
  };

  const handleDeleteStory = async (story: Z4Story) => {
    if (!confirm(`Xoá cốt truyện "${story.title}"?`)) return;
    try {
      await z4chatApi.stories.remove(story.id);
      setStories((prev) => prev.filter((item) => item.id !== story.id));
      push("Đã xoá cốt truyện", "success");
    } catch (error: any) {
      push(error?.response?.data?.error || "Không xoá được cốt truyện", "error");
    }
  };

  const handleDeleteSession = async (session: Z4SessionSummary) => {
    if (!confirm(`Xoá cuộc trò chuyện với ${session.character.name}? Toàn bộ tin nhắn sẽ mất.`)) return;
    try {
      await z4chatApi.sessions.remove(session.id);
      setSessions((prev) => prev.filter((item) => item.id !== session.id));
      setUnread(Math.max(0, unreadTotal - session.unreadCount));
      push("Đã xoá cuộc trò chuyện", "success");
    } catch (error: any) {
      push(error?.response?.data?.error || "Không xoá được cuộc trò chuyện", "error");
    }
  };

  const visibleCharacters = mine(characters);
  const visibleStories = mine(stories);

  return (
    <div className="min-h-screen">
      <RequireAuth />

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#3B82F6]/20 to-[#8B5CF6]/20 border border-[#3B82F6]/30">
            <Sparkles size={20} className="text-[#60A5FA]" />
          </div>
          <h1 className="text-white text-2xl font-black tracking-tight">Z4chat</h1>
        </div>
        <p className="text-[#94a3b8] text-sm leading-relaxed">
          Tạo nhân vật và cốt truyện của riêng bạn, rồi nhập vai cùng họ. Nhân vật sẽ nhớ chuyện đã xảy ra và đôi khi
          nhắn tin trước.
        </p>
      </header>

      {!aiReady && (
        <div className="flex items-start gap-3 bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-2xl p-4 mb-6">
          <AlertTriangle size={18} className="text-[#fbbf24] shrink-0 mt-0.5" />
          <p className="text-[#fcd34d] text-[13px] leading-relaxed">
            Chưa cấu hình API key nào nên nhân vật chưa trả lời được. Thêm{" "}
            <code className="text-[#fef3c7]">OPENROUTER_API_KEY</code> (hoặc GEMINI / GROQ / DEEPSEEK / OPENAI) vào{" "}
            <code className="text-[#fef3c7]">frontend/.env.local</code> rồi khởi động lại là xong. Việc tạo nhân vật và
            cốt truyện vẫn dùng bình thường.
          </p>
        </div>
      )}

      <nav className="flex items-center gap-1.5 bg-[#0f1e30] border border-[#1e3a52] rounded-2xl p-1.5 mb-5">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                active
                  ? "bg-gradient-to-r from-[#3B82F6]/25 to-[#8B5CF6]/25 border border-[#3B82F6]/40 text-white"
                  : "text-[#94a3b8] hover:bg-[#1e293b] border border-transparent"
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{item.label}</span>
              {item.id === "sessions" && unreadTotal > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#ec4899] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadTotal}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {tab !== "sessions" && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 bg-[#0f1e30] border border-[#1e3a52] rounded-xl p-1">
            {(["mine", "public"] as Scope[]).map((value) => (
              <button
                key={value}
                onClick={() => setScope(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  scope === value ? "bg-[#1e293b] text-white" : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                {value === "mine" ? "Của tôi" : "Cộng đồng"}
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              tab === "characters"
                ? setCharacterForm({ open: true, editing: null })
                : setStoryForm({ open: true, editing: null })
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white text-sm font-bold hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-all active:scale-95"
          >
            <Plus size={16} />
            {tab === "characters" ? "Tạo nhân vật" : "Tạo cốt truyện"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[#64748b] text-sm">
          <Loader2 size={18} className="animate-spin" />
          Đang tải…
        </div>
      ) : tab === "characters" ? (
        visibleCharacters.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                isOwner={character.ownerId === user?.id}
                onChat={() => setStartFor(character)}
                onEdit={() => setCharacterForm({ open: true, editing: character })}
                onDelete={() => handleDeleteCharacter(character)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users size={22} className="text-[#60A5FA]" />}
            title={scope === "mine" ? "Bạn chưa có nhân vật nào" : "Chưa ai chia sẻ nhân vật"}
            body={
              scope === "mine"
                ? "Tạo một nhân vật là chat được ngay. Không biết bắt đầu từ đâu thì tả một câu rồi để AI dựng nháp cho bạn."
                : "Khi có người bật “cho người khác dùng nhân vật này”, nhân vật của họ sẽ hiện ở đây."
            }
            action={
              scope === "mine"
                ? { label: "Tạo nhân vật", onClick: () => setCharacterForm({ open: true, editing: null }) }
                : undefined
            }
          />
        )
      ) : tab === "stories" ? (
        visibleStories.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                isOwner={story.ownerId === user?.id}
                onEdit={() => setStoryForm({ open: true, editing: story })}
                onDelete={() => handleDeleteStory(story)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen size={22} className="text-[#a78bfa]" />}
            title={scope === "mine" ? "Chưa có cốt truyện nào" : "Chưa ai chia sẻ cốt truyện"}
            body="Cốt truyện cho nhân vật một bối cảnh, một vai cho bạn, và một màn mở đầu — nhờ vậy hội thoại có hướng đi chứ không lan man. Không có cũng chat được."
            action={
              scope === "mine"
                ? { label: "Tạo cốt truyện", onClick: () => setStoryForm({ open: true, editing: null }) }
                : undefined
            }
          />
        )
      ) : sessions.length ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} onDelete={() => handleDeleteSession(session)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<MessageSquare size={22} className="text-[#60A5FA]" />}
          title="Chưa có cuộc trò chuyện nào"
          body="Chọn một nhân vật ở tab Nhân vật rồi bấm “Bắt đầu chat”."
          action={{ label: "Xem nhân vật", onClick: () => setTab("characters") }}
        />
      )}

      <CharacterForm
        open={characterForm.open}
        editing={characterForm.editing}
        onClose={() => setCharacterForm({ open: false, editing: null })}
        onSaved={(saved) =>
          setCharacters((prev) => {
            const exists = prev.some((item) => item.id === saved.id);
            return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev];
          })
        }
      />

      <StoryForm
        open={storyForm.open}
        editing={storyForm.editing}
        onClose={() => setStoryForm({ open: false, editing: null })}
        onSaved={(saved) =>
          setStories((prev) => {
            const exists = prev.some((item) => item.id === saved.id);
            return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev];
          })
        }
      />

      <StartChatModal
        open={Boolean(startFor)}
        character={startFor}
        stories={stories}
        starting={starting}
        onClose={() => {
          setStartFor(null);
          setStarting(false);
        }}
        onStart={handleStart}
      />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center text-center bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-3xl px-6 py-12">
      <div className="p-3.5 rounded-2xl bg-[#1e293b] border border-[#334155] mb-4">{icon}</div>
      <h3 className="text-white font-bold mb-2">{title}</h3>
      <p className="text-[#94a3b8] text-[13px] leading-relaxed max-w-sm">{body}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white text-sm font-bold hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-all active:scale-95"
        >
          <Plus size={16} />
          {action.label}
        </button>
      )}
    </div>
  );
}
