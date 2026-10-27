import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server, Socket } from 'socket.io';
import type { PrismaClient } from '@prisma/client';
import { initWorld } from '../src/world/world';
import { step, walkable } from '../src/world/rules';
import { FloorGame } from '../src/world/floor';

test('movement rejects boundaries, solids and keeps diagonal speed constant', () => {
  assert.equal(walkable(0, 0), false);
  assert.equal(walkable(500, 350), false);
  assert.equal(walkable(240, 540), false);
  assert.equal(walkable(NaN, 300), false);
  assert.deepEqual(step(430, 350, 1, 0), { x: 430, y: 350 });
  const corner = step(425, 285, 1, 1);
  assert.equal(walkable(corner.x, corner.y), true);
  const diagonal = step(350, 440, 1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x-350, diagonal.y-440)-10) < 0.00001);
});

test('floor validates adjacency, prevents duplicate join and cleans round timers', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const states: ReturnType<FloorGame['state']>[] = [];
  const floor = new FloorGame(state => states.push(state));
  floor.move('outsider', 1);
  floor.join('a'); floor.join('a');
  assert.equal(Object.keys(floor.state().pieces).length, 1);
  floor.join('b');
  assert.equal(floor.state().phase, 'running');
  floor.move('a', 35);
  assert.equal(floor.state().pieces.a.cell, 0);
  floor.move('a', Infinity);
  assert.equal(floor.state().pieces.a.cell, 0);
  floor.move('a', 1);
  assert.equal(floor.state().pieces.a.cell, 1);
  floor.join('c');
  assert.equal(floor.state().pieces.c, undefined);
  floor.leave('b');
  assert.equal(floor.state().phase, 'results');
  const count = states.length;
  t.mock.timers.tick(60_000);
  assert.equal(states.length, count);
  floor.join('a');
  assert.equal(floor.state().phase, 'waiting');
  assert.deepEqual(floor.state().fallen, []);
  floor.dispose();
});

test('world isolates membership, validates moves, protects quiz and cleans disconnects', async () => {
  let connect: (socket: Socket) => void = () => {};
  const io = { on: (_event: string, handler: typeof connect) => { connect = handler; }, to: () => ({ emit: () => {} }) };
  const prisma = { user: { findUnique: async ({ where }: { where: { id: string } }) => ({ id: where.id, username: where.id }) } };
  initWorld(io as unknown as Server, prisma as unknown as PrismaClient);
  function client(id: string) {
    const handlers = new Map<string, (payload?: unknown) => unknown>();
    const emitted: { event: string; payload: unknown }[] = [];
    const socket = { id, userId: id, connected: true, on: (event: string, handler: (payload?: unknown) => unknown) => handlers.set(event, handler),
      emit: (event: string, payload: unknown) => emitted.push({ event, payload }), join: async () => {}, leave: () => {}, to: () => ({ emit: () => {} }) };
    connect(socket as unknown as Socket);
    return { send: async (event: string, payload?: unknown) => handlers.get(event)?.(payload), emitted };
  }
  const a = client('a'), b = client('b');
  await a.send('world:move', { dx: 1, dy: 0 });
  await a.send('world:join'); await b.send('world:join');
  const snapshot = b.emitted.find(e => e.event === 'world:snapshot')?.payload as { players: Record<string, { x: number; y: number }>; game: { participants: string[] } };
  assert.equal(Object.keys(snapshot.players).length, 2);
  const before = snapshot.players.a.x;
  await a.send('world:move', { dx: Infinity, dy: 0 });
  assert.equal(snapshot.players.a.x, before);
  await a.send('world:move', { dx: 1, dy: 0 });
  assert.equal(snapshot.players.a.x, before+10);
  await a.send('world:quiz:join');
  assert.deepEqual(snapshot.game.participants, []);
  await a.send('world:chat', 'hello');
  assert.ok(b.emitted.some(e => e.event === 'world:chat'));
  await a.send('disconnect'); await b.send('disconnect');
  const c = client('c'); await c.send('world:join');
  const last = c.emitted.find(e => e.event === 'world:snapshot')?.payload as { players: Record<string, unknown> };
  assert.deepEqual(Object.keys(last.players), ['c']);
  await c.send('disconnect');
});

test('a cancelled async join cannot replace a newer world join', async () => {
  let connect: (socket: Socket) => void = () => {};
  const io = { on: (_event: string, handler: typeof connect) => { connect = handler; }, to: () => ({ emit: () => {} }) };
  const resolvers: ((value: { id: string; username: string }) => void)[] = [];
  const prisma = { user: { findUnique: () => new Promise(resolve => resolvers.push(resolve)) } };
  initWorld(io as unknown as Server, prisma as unknown as PrismaClient);
  const handlers = new Map<string, (payload?: unknown) => unknown>();
  const events: string[] = [];
  const socket = { id: 'race-socket', userId: 'race-user', connected: true,
    on: (event: string, handler: (payload?: unknown) => unknown) => handlers.set(event, handler),
    emit: (event: string) => events.push(event), join: async () => {}, leave: () => {}, to: () => ({ emit: () => {} }) };
  connect(socket as unknown as Socket);
  const first = handlers.get('world:join')?.();
  handlers.get('world:leave')?.();
  const second = handlers.get('world:join')?.();
  resolvers[0]({ id: 'race-user', username: 'Race' }); await first;
  assert.equal(events.length, 0);
  resolvers[1]({ id: 'race-user', username: 'Race' }); await second;
  assert.deepEqual(events, ['world:snapshot']);
  handlers.get('disconnect')?.();
});
