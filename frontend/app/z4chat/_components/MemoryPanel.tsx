"use client";
import { useState } from "react";
import { BookOpen, Loader2, Pin, PinOff, Plus, Sparkles, Trash2, User } from "lucide-react";
import { z4chatApi } from "@/lib/api/z4chatApi";
import { useToast } from "@/lib/ui/toast";
import type { Z4Memory, Z4Session } from "@/lib/z4chat/types";
import Modal from "./Modal";
import { GhostButton, PrimaryButton, TextInput } from "./FormBits";

/**
 * "Đang nhớ gì?" - the whole answer to "quên cốt truyện".
 *
 * Rather than promising a big context window, this shows the four memory tiers
 * that actually go into the prompt every turn, and makes the one that matters
 * editable. When the character does forget something, the user can see why and
 * pin the fact themselves instead of repeating it and hoping.
 */
export default function MemoryPanel({
  open,
  session,
  memories,
  verbatimCount,
  compacting,
  onClose,
  onMemoriesChange,
  onCompactNow,
}: {
  open: boolean;
  session: Z4Session;
  memories: Z4Memory[];
  /** Raw turns being sent verbatim this turn - tier 3. */
  verbatimCount: number;
  compacting: boolean;
  onClose: () => void;
  onMemoriesChange: (memories: Z4Memory[]) => void;
  onCompactNow: () => void;
}) {
  const { push } = useToast();
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pinned = memories.filter((memory) => memory.pinned);

  const handleAdd = async () => {
    const content = draft.trim();
    if (!content) return;
    setAdding(true);
    try {
      const memory = await z4chatApi.memories.create(session.id, content);
      onMemoriesChange([...memories, memory]);
      setDraft("");
    } catch (error: any) {
      push(error?.response?.data?.error || "Không thêm được ký ức", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleTogglePin = async (memory: Z4Memory) => {
    setBusyId(memory.id);
    try {
      const updated = await z4chatApi.memories.update(session.id, memory.id, { pinned: !memory.pinned });
      onMemoriesChange(memories.map((item) => (item.id === memory.id ? updated : item)));
    } catch (error: any) {
      push(error?.response?.data?.error || "Không cập nhật được ký ức", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (memory: Z4Memory) => {
    setBusyId(memory.id);
    try {
      await z4chatApi.memories.remove(session.id, memory.id);
      onMemoriesChange(memories.filter((item) => item.id !== memory.id));
    } catch (error: any) {
      push(error?.response?.data?.error || "Không xoá được ký ức", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Đang nhớ gì?"
      footer={<GhostButton onClick={onClose}>Đóng</GhostButton>}
    >
      <p className="text-[#94a3b8] text-[13px] leading-relaxed mb-6">
        Đây là đúng những gì {session.character.name} nhận được ở mỗi lượt trả lời. Thấy thiếu gì thì ghim thêm — nhân
        vật sẽ không được phép nói ngược lại những dòng đã ghim.
      </p>

      {/* Tier 0 - the sheet, never trimmed. */}
      <Tier
        icon={<User size={14} className="text-[#60A5FA]" />}
        title="Hồ sơ nhân vật"
        note="luôn gửi đầy đủ, không bao giờ bị cắt"
      >
        <p className="text-[#cbd5e1] text-sm font-semibold">{session.character.name}</p>
        {session.character.tagline && (
          <p className="text-[#94a3b8] text-[13px] mt-0.5">{session.character.tagline}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[
            session.character.personality && "tính cách",
            session.character.speechStyle && "cách nói",
            session.character.exampleDialog && "mẫu hội thoại",
            session.character.likes && "sở thích",
          ]
            .filter(Boolean)
            .map((label) => (
              <span
                key={label as string}
                className="bg-[#1e293b] border border-[#334155] text-[#94a3b8] text-[11px] font-semibold px-2 py-0.5 rounded-md"
              >
                {label}
              </span>
            ))}
        </div>
      </Tier>

      {session.story && (
        <Tier
          icon={<BookOpen size={14} className="text-[#a78bfa]" />}
          title="Cốt truyện"
          note="luôn gửi đầy đủ"
        >
          <p className="text-[#cbd5e1] text-sm font-semibold">{session.story.title}</p>
          {session.story.synopsis && (
            <p className="text-[#94a3b8] text-[13px] mt-1 leading-relaxed">{session.story.synopsis}</p>
          )}
          {session.story.userRoleName && (
            <p className="text-[#64748b] text-xs mt-2">Bạn vào vai: {session.story.userRoleName}</p>
          )}
        </Tier>
      )}

      {/* Tier 1 - the user's own hard facts. */}
      <Tier
        icon={<Pin size={14} className="text-[#fbbf24]" />}
        title="Ký ức đã ghim"
        note={`${pinned.length} đang gửi`}
      >
        <div className="flex gap-2 mb-3">
          <TextInput
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="VD: Tôi tên Huy, hai người đã hứa gặp ở quán cà phê"
            maxLength={300}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
          <PrimaryButton onClick={handleAdd} disabled={adding || !draft.trim()} className="shrink-0 px-4">
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          </PrimaryButton>
        </div>

        {memories.length === 0 ? (
          <p className="text-[#64748b] text-xs">
            Chưa có ký ức nào. Chat một lúc là hệ thống tự trích ra, hoặc bạn ghim tay ngay từ giờ.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {memories.map((memory) => (
              <li
                key={memory.id}
                className={`flex items-start gap-2 rounded-xl px-3 py-2 border ${
                  memory.pinned ? "border-[#fbbf24]/25 bg-[#fbbf24]/5" : "border-[#1e3a52] opacity-60"
                }`}
              >
                <span className="flex-1 min-w-0 text-[#cbd5e1] text-[13px] leading-snug break-words">
                  {memory.content}
                  {memory.source === "auto" && (
                    <span className="text-[#475569] text-[11px] ml-2">(tự trích)</span>
                  )}
                </span>
                <button
                  onClick={() => handleTogglePin(memory)}
                  disabled={busyId === memory.id}
                  className="p-1 rounded-lg text-[#64748b] hover:text-[#fbbf24] disabled:opacity-40 shrink-0"
                  aria-label={memory.pinned ? "Bỏ ghim" : "Ghim lại"}
                  title={memory.pinned ? "Bỏ ghim (không gửi nữa)" : "Ghim lại"}
                >
                  {memory.pinned ? <Pin size={13} /> : <PinOff size={13} />}
                </button>
                <button
                  onClick={() => handleDelete(memory)}
                  disabled={busyId === memory.id}
                  className="p-1 rounded-lg text-[#64748b] hover:text-[#f87171] disabled:opacity-40 shrink-0"
                  aria-label="Xoá ký ức"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tier>

      {/* Tier 2 - the rolling summary. */}
      <Tier
        icon={<Sparkles size={14} className="text-[#8B5CF6]" />}
        title="Tóm tắt chuyện đã xảy ra"
        note={session.summarizedUpTo ? `đã nén ${session.summarizedUpTo} tin nhắn đầu` : "chưa cần nén"}
      >
        {session.summary ? (
          <p className="text-[#94a3b8] text-[13px] leading-relaxed whitespace-pre-wrap">{session.summary}</p>
        ) : (
          <p className="text-[#64748b] text-xs">
            Hội thoại còn ngắn nên vẫn gửi nguyên văn toàn bộ — chưa cần tóm tắt.
          </p>
        )}
        <button
          onClick={onCompactNow}
          disabled={compacting}
          className="flex items-center gap-1.5 mt-3 text-[#60A5FA] hover:text-[#93c5fd] text-xs font-semibold disabled:opacity-40"
        >
          {compacting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {compacting ? "Đang nén…" : "Nén ký ức ngay"}
        </button>
      </Tier>

      {/* Tier 3 - raw tail. */}
      <Tier
        icon={<Sparkles size={14} className="text-[#22d3ee]" />}
        title="Tin nhắn gửi nguyên văn"
        note={`${verbatimCount} tin gần nhất`}
      >
        <p className="text-[#64748b] text-xs leading-relaxed">
          Phần mới nhất của hội thoại luôn được gửi y nguyên. Cũ hơn thì nằm trong tóm tắt ở trên.
        </p>
      </Tier>
    </Modal>
  );
}

function Tier({
  icon,
  title,
  note,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 last:mb-0">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="shrink-0 translate-y-0.5">{icon}</span>
        <h3 className="text-[#e2e8f0] text-sm font-bold">{title}</h3>
        {note && <span className="text-[#475569] text-[11px]">{note}</span>}
      </div>
      <div className="bg-[#0a1628] border border-[#1e3a52] rounded-2xl p-4">{children}</div>
    </section>
  );
}
