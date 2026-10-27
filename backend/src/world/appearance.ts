export const CHARACTER_IDS = ["peach", "lavender"] as const;
export const HAIR_COLORS = ["original", "espresso", "copper"] as const;
export const OUTFIT_COLORS = ["original", "mint", "sky", "rose"] as const;
export type Appearance = {
  character: (typeof CHARACTER_IDS)[number];
  hair: (typeof HAIR_COLORS)[number];
  outfit: (typeof OUTFIT_COLORS)[number];
};
export function defaultAppearance(id: string): Appearance {
  return {
    character:
      [...id].reduce((n, c) => n + c.charCodeAt(0), 0) % 2
        ? "lavender"
        : "peach",
    hair: "original",
    outfit: "original",
  };
}
export function parseAppearance(value: unknown): Appearance | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some((k) => !["character", "hair", "outfit"].includes(k))
  )
    return null;
  if (
    !CHARACTER_IDS.some((v) => v === input.character) ||
    !HAIR_COLORS.some((v) => v === input.hair) ||
    !OUTFIT_COLORS.some((v) => v === input.outfit)
  )
    return null;
  return {
    character: input.character,
    hair: input.hair,
    outfit: input.outfit,
  } as Appearance;
}

const listeners = new Set<(userId: string, value: Appearance) => void>();
export function onAppearanceSaved(
  listener: (userId: string, value: Appearance) => void,
) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function publishAppearance(userId: string, value: Appearance) {
  for (const listener of listeners) listener(userId, value);
}
