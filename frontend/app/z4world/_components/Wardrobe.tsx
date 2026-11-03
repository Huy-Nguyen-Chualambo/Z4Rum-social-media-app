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
    <div className="[@media(max-height:500px)]:grid [@media(max-height:500px)]:grid-cols-[auto_minmax(0,1fr)] [@media(max-height:500px)]:items-start [@media(max-height:500px)]:gap-x-4">
      <svg
        viewBox="-55 -90 110 110"
        className="mx-auto h-52 w-52 rounded-full border border-[#303030] bg-[#1c1c1c] [@media(max-height:500px)]:sticky [@media(max-height:500px)]:top-0 [@media(max-height:500px)]:h-36 [@media(max-height:500px)]:w-36"
        aria-label="Xem trước ngoại hình"
      >
        <ellipse cy="2" rx="22" ry="8" fill="#000" opacity=".4" />
        <AvatarSprite appearance={draft} />
      </svg>
      <div>
        {groups.map((group) => (
          <fieldset
            key={group.key}
            className="my-4 [@media(max-height:500px)]:mb-3 [@media(max-height:500px)]:mt-0"
          >
            <legend className="mb-2 text-sm text-[#a3a3a3]">
              {group.label}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => (
                <button
                  key={option.id}
                  disabled={saving}
                  aria-pressed={draft[group.key] === option.id}
                  className={`min-h-11 rounded-sm border px-3 text-sm ${draft[group.key] === option.id ? "border-blue-500 bg-blue-500/15 text-white" : "border-[#303030] text-[#dedede] hover:bg-[#292929]"}`}
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
          className="min-h-11 rounded-sm bg-blue-500 px-4 font-semibold text-white disabled:opacity-50"
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
    </div>
  );
}
