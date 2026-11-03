import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkable } from '../../../backend/src/world/rules';
import { ambientPosition, ambientWalkers } from './ambient';

test('ambient walkers never cross anything solid and always keep moving', () => {
  for (const walker of ambientWalkers) {
    let previous = ambientPosition(walker, 0);
    for (let now = 250; now < 120_000; now += 250) {
      const p = ambientPosition(walker, now);
      assert.ok(walkable(p.x, p.y), `${walker.key} at ${p.x},${p.y}`);
      assert.ok(Math.hypot(p.x - previous.x, p.y - previous.y) < 30, `${walker.key} must not teleport`);
      previous = p;
    }
  }
});
