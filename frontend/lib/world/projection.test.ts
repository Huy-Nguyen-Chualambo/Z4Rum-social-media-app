import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraView, facingFor, project, screenDirection, WORLD_VIEW } from './projection';

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

test('follow camera stays inside the world on every screen shape and centers when larger', () => {
  const screens = [undefined, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }, { width: 2560, height: 1080 }];
  for (const screen of screens) for (const [x,y] of [[0,0],[1000,0],[0,700],[1000,700]]) {
    const [cx,cy,w,h] = cameraView(x,y,true,screen).split(' ').map(Number);
    if (w <= WORLD_VIEW.width) assert.ok(cx >= 0 && cx+w <= WORLD_VIEW.width);
    else assert.ok(Math.abs(cx+w/2-WORLD_VIEW.width/2) <= 1);
    if (h <= WORLD_VIEW.height) assert.ok(cy >= 0 && cy+h <= WORLD_VIEW.height);
    else assert.ok(Math.abs(cy+h/2-WORLD_VIEW.height/2) <= 1);
  }
});

test('camera matches the screen aspect ratio and overview keeps the whole map visible', () => {
  for (const screen of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1920, height: 1080 }]) {
    for (const follow of [true, false]) {
      const [,,w,h] = cameraView(500,350,follow,screen).split(' ').map(Number);
      assert.ok(Math.abs(w/h-screen.width/screen.height) < 0.01);
    }
    const [x,y,w,h] = cameraView(500,350,false,screen).split(' ').map(Number);
    assert.ok(x <= 130 && y <= 40 && x+w >= 1630 && y+h >= 960);
  }
});

test('facing ignores rounding noise but follows real direction changes', () => {
  assert.equal(facingFor(7.071067811865476, 7.071067811865475, 'front-left'), 'front-left');
  assert.equal(facingFor(7.071067811865475, 7.071067811865476, 'front-right'), 'front-right');
  assert.equal(facingFor(-5, 5, 'front-left'), 'front-left');
  assert.equal(facingFor(5, -5, 'front-left'), 'front-right');
  assert.equal(facingFor(10, 0), 'front-right');
  assert.equal(facingFor(-10, 0), 'back-left');
});
