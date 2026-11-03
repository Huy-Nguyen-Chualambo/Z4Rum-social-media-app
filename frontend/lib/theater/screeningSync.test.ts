import { test } from "node:test";
import assert from "node:assert/strict";
import { sharedPosition, syncStep } from "./screeningSync";

const shared = (position: number, playing = true) => ({
  position,
  playing,
  receivedAt: 1000,
});
const step = (current: number, position: number, extra = {}) =>
  syncStep({
    current,
    paused: false,
    duration: 600,
    shared: shared(position),
    now: 1000,
    lastSeekAt: -Infinity,
    ...extra,
  });

test("the shared position advances only while the host plays", () => {
  assert.equal(sharedPosition(shared(10), 3000), 12);
  assert.equal(sharedPosition(shared(10, false), 3000), 10);
});

test("in sync: nothing changes", () => {
  assert.deepEqual(step(100.1, 100), { seekTo: null, play: null, rate: 1 });
});

test("small drift is corrected by speed, large drift by seeking", () => {
  assert.equal(step(100, 101).rate, 1.05);
  assert.equal(step(101, 100).rate, 0.95);
  assert.equal(step(101, 100).seekTo, null);
  assert.deepEqual(step(100, 110), { seekTo: 110, play: null, rate: 1 });
});

test("seeks are spaced out so a slow network cannot loop", () => {
  const blocked = step(100, 110, { now: 1000, lastSeekAt: 0 });
  assert.equal(blocked.seekTo, null);
  assert.equal(blocked.rate, 1.05);
});

test("a viewer follows play and pause", () => {
  assert.equal(step(100, 100, { paused: true }).play, true);
  const paused = syncStep({
    current: 100,
    paused: false,
    duration: 600,
    shared: shared(100, false),
    now: 1000,
    lastSeekAt: 0,
  });
  assert.equal(paused.play, false);
  assert.equal(paused.rate, 1);
  assert.equal(
    syncStep({
      current: 90,
      paused: true,
      duration: 600,
      shared: shared(100, false),
      now: 1000,
      lastSeekAt: 999,
    }).seekTo,
    100,
    "a paused picture always matches the host's frame",
  );
});

test("a position past the end stays at the end and does not restart", () => {
  const result = step(599, 700, { paused: true, lastSeekAt: -Infinity });
  assert.equal(result.seekTo, null);
  assert.equal(result.play, null);
});
