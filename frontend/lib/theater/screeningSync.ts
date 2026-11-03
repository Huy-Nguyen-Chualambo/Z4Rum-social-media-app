const SEEK_AFTER = 3; // Seconds of drift a viewer would notice.
const NUDGE_AFTER = 0.4;
const SEEK_COOLDOWN_MS = 4_000; // Seeking re-buffers: never let it fight a slow network.

export type SharedPlayback = {
  position: number;
  playing: boolean;
  receivedAt: number;
};

export const sharedPosition = (shared: SharedPlayback, now: number) =>
  shared.position + (shared.playing ? (now - shared.receivedAt) / 1000 : 0);

/** What a viewer's player should do to match the host, given where it is now. */
export function syncStep({
  current,
  paused,
  duration,
  shared,
  now,
  lastSeekAt,
}: {
  current: number;
  paused: boolean;
  duration: number;
  shared: SharedPlayback;
  now: number;
  lastSeekAt: number;
}): { seekTo: number | null; play: boolean | null; rate: number } {
  const known = Number.isFinite(duration) && duration > 0;
  const target = known
    ? Math.min(sharedPosition(shared, now), duration)
    : sharedPosition(shared, now);
  const drift = target - current;
  if (!shared.playing)
    return {
      seekTo: Math.abs(drift) > NUDGE_AFTER ? target : null,
      play: paused ? null : false,
      rate: 1,
    };
  const ended = known && target >= duration;
  const seek = Math.abs(drift) > SEEK_AFTER && now - lastSeekAt > SEEK_COOLDOWN_MS;
  return {
    seekTo: seek ? target : null,
    play: paused && !ended ? true : null,
    // Small drift is corrected by speed, which viewers cannot see.
    rate:
      seek || Math.abs(drift) <= NUDGE_AFTER ? 1 : drift > 0 ? 1.05 : 0.95,
  };
}
