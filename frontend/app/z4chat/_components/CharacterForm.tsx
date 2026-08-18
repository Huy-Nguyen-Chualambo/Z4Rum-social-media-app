"use client";
import { useEffect, useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { z4chatAi, z4chatApi, type CharacterInput } from "@/lib/api/z4chatApi";
import { uploadImage } from "@/lib/utils/cloudinary";
import { useToast } from "@/lib/ui/toast";
import type { Z4Character } from "@/lib/z4chat/types";
import Modal from "./Modal";
import { Field, GhostButton, PrimaryButton, TagInput, TextArea, TextInput, Toggle } from "./FormBits";

const EMPTY: CharacterInput = {
  name: "",
  description: "",
  greeting: "",
  avatarUrl: "",
  tagline: "",
  personality: "",
  speechStyle: "",
  exampleDialog: "",
  likes: "",
  dislikes: "",
  tags: [],
  isPublic: false,
  proactive: true,
  clinginess: 2,
};

const CLINGINESS_LABEL: Record<number, string> = {
  1: "Kiệm lời — chỉ nhắn khi bạn vắng cả ngày",
  2: "Vừa phải — nhắn sau vài tiếng",
  3: "Quấn quýt — nhắn sau khoảng 2 tiếng",
};

const fromCharacter = (character: Z4Character): CharacterInput => ({
  name: character.name,
  description: character.description,
  greeting: character.greeting,
  avatarUrl: character.avatarUrl || "",
  tagline: character.tagline || "",
  personality: character.personality || "",
  speechStyle: character.speechStyle || "",
  exampleDialog: character.exampleDialog || "",
  likes: character.likes || "",
  dislikes: character.dislikes || "",
  tags: character.tags,
  isPublic: character.isPublic,
  proactive: character.proactive,
  clinginess: character.clinginess,
});

export default function CharacterForm({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: Z4Character | null;
  onClose: () => void;
  onSaved: (character: Z4Character) => void;
}) {
  const { push } = useToast();
  const [form, setForm] = useState<CharacterInput>(EMPTY);
  const [brief, setBrief] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? fromCharacter(editing) : EMPTY);
    setBrief("");
  }, [open, editing]);

  const set = <K extends keyof CharacterInput>(key: K, value: CharacterInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = async () => {
    if (!brief.trim()) {
      push("Hãy tả ngắn nhân vật bạn muốn", "error");
      return;
    }
    setGenerating(true);
    try {
      const draft = await z4chatAi.generate({ kind: "character", brief: brief.trim() });
      // Merge, not replace: whatever the user already wrote by hand wins.
      setForm((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(draft)) {
          if (key === "tags") {
            if (!prev.tags?.length && Array.isArray(value)) next.tags = value as string[];
          } else if (typeof value === "string" && !(prev as Record<string, unknown>)[key]) {
            (next as Record<string, unknown>)[key] = value;
          }
        }
        return next;
      });
      push("Đã tạo bản nháp, bạn sửa lại cho vừa ý nha", "success");
    } catch (error: any) {
      push(error?.message || "Tạo nháp thất bại", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      set("avatarUrl", await uploadImage(file));
    } catch (error: any) {
      push(error?.message || "Tải ảnh thất bại", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.greeting.trim()) {
      push("Cần có tên, mô tả và câu chào mở đầu", "error");
      return;
    }
    setSaving(true);
    try {
      const saved = editing
        ? await z4chatApi.characters.update(editing.id, form)
        : await z4chatApi.characters.create(form);
      push(editing ? "Đã lưu nhân vật" : "Đã tạo nhân vật", "success");
      onSaved(saved);
      onClose();
    } catch (error: any) {
      push(error?.response?.data?.error || "Lưu nhân vật thất bại", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Sửa nhân vật" : "Tạo nhân vật"}
      footer={
        <>
          <GhostButton onClick={onClose} disabled={saving}>
            Huỷ
          </GhostButton>
          <PrimaryButton onClick={handleSave} disabled={saving || uploading}>
            {saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo nhân vật"}
          </PrimaryButton>
        </>
      }
    >
      {/* Quick draft: the blank-page problem is why most people never finish a character. */}
      <div className="mb-6 bg-[#3B82F6]/5 border border-[#3B82F6]/25 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles size={16} className="text-[#8B5CF6]" />
          <span className="text-[#cbd5e1] text-sm font-bold">Tạo nhanh bằng AI</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <TextInput
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="VD: nữ pháp sư lạnh lùng nhưng thương người, sống ở thư viện cổ"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleGenerate();
              }
            }}
          />
          <PrimaryButton onClick={handleGenerate} disabled={generating} className="shrink-0">
            {generating ? <Loader2 size={16} className="animate-spin" /> : "Tạo nháp"}
          </PrimaryButton>
        </div>
        <p className="text-[#64748b] text-xs mt-2">Chỉ điền vào các ô còn trống, không ghi đè thứ bạn đã viết.</p>
      </div>

      <div className="flex items-start gap-4 mb-5">
        <img
          src={form.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4"}
          alt="avatar"
          className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#1e3a52] shrink-0"
        />
        <div className="flex-1 min-w-0">
          <input type="file" id="z4-avatar" accept="image/*" className="hidden" onChange={handleAvatar} />
          <GhostButton
            onClick={() => document.getElementById("z4-avatar")?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-sm"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? "Đang tải…" : "Đổi ảnh đại diện"}
          </GhostButton>
          {form.avatarUrl && (
            <button
              onClick={() => set("avatarUrl", "")}
              className="ml-3 text-[#64748b] hover:text-[#f87171] text-xs font-semibold"
            >
              Xoá ảnh
            </button>
          )}
        </div>
      </div>

      <Field label="Tên nhân vật" required>
        <TextInput value={form.name} onChange={(event) => set("name", event.target.value)} maxLength={60} />
      </Field>

      <Field label="Giới thiệu một dòng" hint="hiện trên thẻ nhân vật">
        <TextInput
          value={form.tagline}
          onChange={(event) => set("tagline", event.target.value)}
          maxLength={160}
          placeholder="Pháp sư trẻ nhất trong hội, và cũng cô đơn nhất"
        />
      </Field>

      <Field label="Nhân vật này là ai" required hint="lai lịch, hoàn cảnh, động cơ">
        <TextArea rows={4} value={form.description} onChange={(event) => set("description", event.target.value)} />
      </Field>

      <Field label="Tính cách" hint="nên có cả điểm yếu">
        <TextArea value={form.personality} onChange={(event) => set("personality", event.target.value)} />
      </Field>

      <Field label="Cách nói chuyện" hint="nhịp câu, thói quen, từ hay dùng">
        <TextArea value={form.speechStyle} onChange={(event) => set("speechStyle", event.target.value)} />
      </Field>

      <Field label="Câu chào mở đầu" required hint="lời đầu tiên khi vào chat">
        <TextArea
          value={form.greeting}
          onChange={(event) => set("greeting", event.target.value)}
          placeholder="*đặt quyển sách xuống, nhìn bạn qua vành kính* Lại là cậu à…"
        />
      </Field>

      <Field label="Mẫu hội thoại" hint="quan trọng nhất để giữ đúng giọng nhân vật">
        <TextArea
          rows={4}
          value={form.exampleDialog}
          onChange={(event) => set("exampleDialog", event.target.value)}
          placeholder={"Người dùng: Cậu đang đọc gì?\nLan: *gấp sách lại* Thứ mà cậu sẽ thấy nhàm chết đi được."}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Field label="Thích">
          <TextInput value={form.likes} onChange={(event) => set("likes", event.target.value)} />
        </Field>
        <Field label="Không thích">
          <TextInput value={form.dislikes} onChange={(event) => set("dislikes", event.target.value)} />
        </Field>
      </div>

      <Field label="Thẻ" hint="tối đa 6">
        <TagInput value={form.tags || []} onChange={(tags) => set("tags", tags)} />
      </Field>

      <div className="border-t border-[#1e3a52] pt-5 mt-2">
        <Toggle
          checked={Boolean(form.proactive)}
          onChange={(value) => set("proactive", value)}
          label="Cho nhân vật nhắn tin trước"
          hint="Khi bạn vắng một lúc, nhân vật sẽ chủ động hỏi thăm hoặc chúc ngủ ngon."
        />

        {form.proactive && (
          <Field label="Mức độ quan tâm">
            <div className="flex gap-2">
              {[1, 2, 3].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => set("clinginess", level)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                    form.clinginess === level
                      ? "bg-gradient-to-r from-[#3B82F6]/25 to-[#8B5CF6]/25 border border-[#3B82F6]/50 text-white"
                      : "border border-[#1e3a52] text-[#94a3b8] hover:bg-[#1e293b]"
                  }`}
                >
                  {level === 1 ? "Nhẹ" : level === 2 ? "Vừa" : "Nhiều"}
                </button>
              ))}
            </div>
            <p className="text-[#64748b] text-xs mt-2">{CLINGINESS_LABEL[form.clinginess || 2]}</p>
          </Field>
        )}

        <Toggle
          checked={Boolean(form.isPublic)}
          onChange={(value) => set("isPublic", value)}
          label="Cho người khác dùng nhân vật này"
          hint="Người khác chỉ mở được cuộc trò chuyện riêng của họ, không thấy chat của bạn."
        />
      </div>
    </Modal>
  );
}
