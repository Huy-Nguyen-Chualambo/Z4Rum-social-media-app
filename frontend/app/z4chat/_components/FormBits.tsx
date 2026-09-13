"use client";
import { X } from "lucide-react";

/** Form primitives shared by the character and story forms. */

const baseInput =
  "w-full bg-[#141414] border border-[#303030] rounded-sm px-4 py-2.5 text-[#ededed] placeholder:text-[#858585] outline-none focus:border-[#3B82F6]/60 transition-colors";

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-4">
      <span className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[#dedede] text-sm font-semibold">
          {label}
          {required && <span className="text-[#f87171] ml-1">*</span>}
        </span>
        {hint && <span className="text-[#969696] text-xs">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className || ""}`} />;
}

export function TextArea({ rows = 3, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} {...props} className={`${baseInput} resize-y leading-relaxed ${props.className || ""}`} />;
}

export function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const add = (raw: string) => {
    const tag = raw.trim().slice(0, 32);
    if (!tag || value.includes(tag) || value.length >= 6) return;
    onChange([...value, tag]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-[#141414] border border-[#303030] rounded-sm px-3 py-2">
      {value.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1.5 bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] text-xs font-semibold px-2.5 py-1 rounded-lg"
        >
          {tag}
          <button type="button" onClick={() => onChange(value.filter((item) => item !== tag))}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        placeholder={value.length ? "" : "Nhập thẻ rồi Enter…"}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-[#ededed] placeholder:text-[#858585] py-1 text-sm"
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== ",") return;
          event.preventDefault();
          add(event.currentTarget.value);
          event.currentTarget.value = "";
        }}
        onBlur={(event) => {
          add(event.currentTarget.value);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 w-full text-left mb-4"
    >
      <span
        className={`mt-0.5 w-10 h-6 rounded-full shrink-0 transition-colors relative ${
          checked ? "bg-[#3B82F6]" : "bg-[#292929] border border-[#383838]"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? "left-5" : "left-1"}`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[#dedede] text-sm font-semibold">{label}</span>
        {hint && <span className="block text-[#969696] text-xs mt-0.5">{hint}</span>}
      </span>
    </button>
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-5 py-2.5 bg-blue-500 text-white font-bold rounded-sm  transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed  ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-4 py-2.5 rounded-sm border border-[#303030] text-[#dedede] font-semibold hover:bg-[#292929] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${props.className || ""}`}
    >
      {children}
    </button>
  );
}
