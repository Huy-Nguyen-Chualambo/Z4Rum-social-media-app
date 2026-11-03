import { useCallback, useSyncExternalStore } from "react";

/** Touch screens, or any window too small for the expanded desktop controls. */
export const COMPACT_QUERY = "(pointer: coarse), (max-width: 767px), (max-height: 500px)";
export const PHONE_QUERY = "(pointer: coarse) and (max-width: 600px), (pointer: coarse) and (max-height: 500px)";
export const PHONE_PORTRAIT_QUERY = "(max-width: 600px) and (orientation: portrait)";

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};
const orientation = () => screen.orientation as LockableOrientation | undefined;

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (change: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", change);
      return () => media.removeEventListener("change", change);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const subscribeFullscreen = (change: () => void) => {
  document.addEventListener("fullscreenchange", change);
  return () => document.removeEventListener("fullscreenchange", change);
};
export function useFullscreen() {
  const active = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(document.fullscreenElement),
    () => false,
  );
  const supported = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(document.fullscreenEnabled),
    () => false,
  );
  return { active, supported };
}

const neverChanges = () => () => {};
const isLowPower = () => {
  const { hardwareConcurrency, deviceMemory } = navigator as Navigator & {
    deviceMemory?: number;
  };
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    hardwareConcurrency <= 4 ||
    (deviceMemory ?? 8) <= 4
  );
};
/** Phones and weak machines: decorations that never stop moving are left out. */
export const useLowPower = () =>
  useSyncExternalStore(neverChanges, isLowPower, () => false);

/** True where the browser can actually hold landscape (not iPhone Safari). */
export const canLockLandscape = () =>
  Boolean(document.fullscreenEnabled && orientation()?.lock);

/**
 * Must start inside a click handler. Browsers such as iPhone Safari refuse one
 * or both steps; the game stays fully playable, so refusals are ignored.
 */
export async function enterImmersive(landscape: boolean) {
  try {
    if (!document.fullscreenElement)
      await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
    if (landscape) await orientation()?.lock?.("landscape");
  } catch {
    // Keep playing in the normal browser window.
  }
}

export function exitImmersive() {
  if (!document.fullscreenElement) return;
  try {
    orientation()?.unlock?.();
  } catch {
    // Exiting full screen below also releases any lock.
  }
  document.exitFullscreen?.().catch(() => {});
}
