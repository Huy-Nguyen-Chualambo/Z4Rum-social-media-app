"use client";
import { useState } from "react";
import { isAxiosError } from "axios";
import { axiosClient } from "@/lib/api/axiosClient";
import type { Appearance } from "@/lib/world/types";
import AvatarSprite from "./AvatarSprite";
export default function Wardrobe({
  initial,
  onSaved,
}: {
  initial: Appearance;
  onSaved: (value: Appearance) => void;
}) {
  const [draft, setDraft] = useState(initial),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const groups: {
    key: keyof Appearance;
    label: string;
    options: { id: string; label: string }[];
  }[] = [
    {
      key: "character",
      label: "Nhân vật",
      options: [
        { id: "peach", label: "Đào ấm" },
        { id: "lavender", label: "Oải hương" },
      ],
    },
    {
      key: "hair",
      label: "Màu tóc",
      options: [
        { id: "original", label: "Nguyên bản" },
        { id: "espresso", label: "Nâu đậm" },
        { id: "copper", label: "Nâu đồng" },
      ],
    },
    {
      key: "outfit",
      label: "Màu áo",
      options: [
        { id: "original", label: "Nguyên bản" },
        { id: "mint", label: "Bạc hà" },
        { id: "sky", label: "Xanh trời" },
        { id: "rose", label: "Hồng phấn" },
      ],
    },
  ];
  return (
    <div>
      <svg
        viewBox="-55 -90 110 110"
        className="mx-auto h-52 w-52 rounded-full bg-[#e8e5cd]"
        aria-label="Xem trước ngoại hình"
      >
        <ellipse cy="2" rx="22" ry="8" fill="#9aab83" />
        <AvatarSprite appearance={draft} />
      </svg>
      {groups.map((group) => (
        <fieldset key={group.key} className="my-4">
          <legend className="mb-2 text-sm text-neutral-300">
            {group.label}
          </legend>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => (
              <button
                key={option.id}
                disabled={saving}
                aria-pressed={draft[group.key] === option.id}
                className={`min-h-11 rounded-lg border px-3 text-sm ${draft[group.key] === option.id ? "border-emerald-300 bg-emerald-900" : "border-neutral-600"}`}
                onClick={() =>
                  setDraft((value) => ({ ...value, [group.key]: option.id }))
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      {error && (
        <p role="alert" className="my-3 text-sm text-amber-200">
          {error}
        </p>
      )}
      <p className="mb-3 text-xs text-neutral-400">
        Lưu theo tài khoản. Màu áo chỉ đổi phần vải, không đổi màu da.
      </p>
      <button
        disabled={saving}
        className="min-h-11 rounded-lg bg-emerald-700 px-4 disabled:opacity-50"
        onClick={async () => {
          setSaving(true);
          setError("");
          try {
            const { data } = await axiosClient.put<Appearance>(
              "/world/profile",
              draft,
            );
            onSaved(data);
          } catch (error) {
            setError(
              isAxiosError(error) && error.response?.status === 429
                ? "Bạn lưu quá nhanh. Hãy đợi khoảng một phút rồi thử lại."
                : "Chưa lưu được ngoại hình. Kiểm tra kết nối rồi thử lại; lựa chọn của bạn vẫn được giữ ở đây.",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "Đang lưu…" : "Lưu ngoại hình"}
      </button>
    </div>
  );
}
