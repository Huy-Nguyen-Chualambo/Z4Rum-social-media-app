import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraView, project, screenDirection, WORLD_VIEW } from './projection';

test('screen directions stay intuitive after isometric projection and respect server input bounds', () => {
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
    const movement = screenDirection(dx, dy);
    assert.ok(Math.abs(movement.x) <= 1 && Math.abs(movement.y) <= 1);
    const from = project(400,400), to = project(400+movement.x,400+movement.y);
    const sx = to.x-from.x, sy = to.y-from.y;
    if (dx === 0) assert.ok(Math.abs(sx) < 1e-8); else assert.equal(Math.sign(sx), Math.sign(dx));
    if (dy === 0) assert.ok(Math.abs(sy) < 1e-8); else assert.equal(Math.sign(sy), Math.sign(dy));
  }
});

test('follow camera remains inside the world at all four corners', () => {
  for (const [x,y] of [[0,0],[1000,0],[0,700],[1000,700]]) {
    const [cx,cy,w,h] = cameraView(x,y,true).split(' ').map(Number);
    assert.ok(cx >= 0 && cy >= 0 && cx+w <= WORLD_VIEW.width && cy+h <= WORLD_VIEW.height);
  }
});
