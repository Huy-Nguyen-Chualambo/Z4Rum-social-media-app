"use client";
import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { z4chatAi, z4chatApi, type StoryInput } from "@/lib/api/z4chatApi";
import { useToast } from "@/lib/ui/toast";
import type { Z4Story } from "@/lib/z4chat/types";
import Modal from "./Modal";
import { Field, GhostButton, PrimaryButton, TagInput, TextArea, TextInput, Toggle } from "./FormBits";

const EMPTY: StoryInput = {
  title: "",
  synopsis: "",
  worldSetting: "",
  plotOutline: "",
  userRoleName: "",
  userRoleDesc: "",
  openingScene: "",
  tags: [],
  isPublic: false,
};

const fromStory = (story: Z4Story): StoryInput => ({
  title: story.title,
  synopsis: story.synopsis || "",
  worldSetting: story.worldSetting || "",
  plotOutline: story.plotOutline || "",
  userRoleName: story.userRoleName || "",
  userRoleDesc: story.userRoleDesc || "",
  openingScene: story.openingScene || "",
  tags: story.tags,
  isPublic: story.isPublic,
});

export default function StoryForm({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: Z4Story | null;
  onClose: () => void;
  onSaved: (story: Z4Story) => void;
}) {
  const { push } = useToast();
  const [form, setForm] = useState<StoryInput>(EMPTY);
  const [brief, setBrief] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? fromStory(editing) : EMPTY);
    setBrief("");
  }, [open, editing]);

  const set = <K extends keyof StoryInput>(key: K, value: StoryInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = async () => {
    if (!brief.trim()) {
      push("Hãy tả ngắn cốt truyện bạn muốn", "error");
      return;
    }
    setGenerating(true);
    try {
      const draft = await z4chatAi.generate({ kind: "story", brief: brief.trim() });
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
      push("Đã tạo bản nháp cốt truyện", "success");
    } catch (error: any) {
      push(error?.message || "Tạo nháp thất bại", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      push("Cốt truyện cần có tên", "error");
      return;
    }
    setSaving(true);
    try {
      const saved = editing
        ? await z4chatApi.stories.update(editing.id, form)
        : await z4chatApi.stories.create(form);
      push(editing ? "Đã lưu cốt truyện" : "Đã tạo cốt truyện", "success");
      onSaved(saved);
      onClose();
    } catch (error: any) {
      push(error?.response?.data?.error || "Lưu cốt truyện thất bại", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Sửa cốt truyện" : "Tạo cốt truyện"}
      footer={
        <>
          <GhostButton onClick={onClose} disabled={saving}>
            Huỷ
          </GhostButton>
          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo cốt truyện"}
          </PrimaryButton>
        </>
      }
    >
      <div className="mb-6 bg-[#8B5CF6]/5 border border-[#8B5CF6]/25 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles size={16} className="text-[#8B5CF6]" />
          <span className="text-[#cbd5e1] text-sm font-bold">Tạo nhanh bằng AI</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <TextInput
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="VD: hai người mắc kẹt trong thư viện đóng cửa suốt một đêm mưa"
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
      </div>

      <Field label="Tên cốt truyện" required>
        <TextInput value={form.title} onChange={(event) => set("title", event.target.value)} maxLength={120} />
      </Field>

      <Field label="Tóm lược" hint="2-3 câu">
        <TextArea value={form.synopsis} onChange={(event) => set("synopsis", event.target.value)} />
      </Field>

      <Field label="Thế giới / bối cảnh" hint="thời gian, không gian, luật lệ">
        <TextArea value={form.worldSetting} onChange={(event) => set("worldSetting", event.target.value)} />
      </Field>

      <Field label="Diễn biến dự kiến" hint="mỗi mốc một dòng, để mở là tốt nhất">
        <TextArea rows={4} value={form.plotOutline} onChange={(event) => set("plotOutline", event.target.value)} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Field label="Bạn vào vai ai">
          <TextInput
            value={form.userRoleName}
            onChange={(event) => set("userRoleName", event.target.value)}
            maxLength={60}
            placeholder="Người thủ thư mới"
          />
        </Field>
        <Field label="Vai đó có gì đặc biệt">
          <TextInput value={form.userRoleDesc} onChange={(event) => set("userRoleDesc", event.target.value)} />
        </Field>
      </div>

      <Field label="Cảnh mở màn" hint="hiện ngay khi bắt đầu chat, trước cả câu chào của nhân vật">
        <TextArea rows={4} value={form.openingScene} onChange={(event) => set("openingScene", event.target.value)} />
      </Field>

      <Field label="Thẻ" hint="tối đa 6">
        <TagInput value={form.tags || []} onChange={(tags) => set("tags", tags)} />
      </Field>

      <div className="border-t border-[#1e3a52] pt-5 mt-2">
        <Toggle
          checked={Boolean(form.isPublic)}
          onChange={(value) => set("isPublic", value)}
          label="Cho người khác dùng cốt truyện này"
        />
      </div>
    </Modal>
  );
}
