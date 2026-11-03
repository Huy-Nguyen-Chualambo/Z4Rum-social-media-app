import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server, Socket } from 'socket.io';
import type { PrismaClient } from '@prisma/client';
import { initWorld } from '../src/world/world';
import { step, walkable } from '../src/world/rules';

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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('world isolates membership, validates moves, protects screenings and cleans disconnects', async () => {
  let connect: (socket: Socket) => void = () => {};
  const broadcasts: { event: string; payload: unknown }[] = [];
  const screenings = () => broadcasts.filter(e => e.event === 'world:screening').map(e => e.payload);
  const io = { on: (_event: string, handler: typeof connect) => { connect = handler; }, to: () => ({ emit: (event: string, payload: unknown) => broadcasts.push({ event, payload }) }) };
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
  const snapshot = b.emitted.find(e => e.event === 'world:snapshot')?.payload as { players: Record<string, { x: number; y: number }>; screening: unknown };
  assert.equal(Object.keys(snapshot.players).length, 2);
  const before = snapshot.players.a.x;
  await a.send('world:move', { dx: Infinity, dy: 0 });
  assert.equal(snapshot.players.a.x, before);
  await a.send('world:move', { dx: 1, dy: 0 });
  assert.equal(snapshot.players.a.x, before+10);
  // A burst is capped to the credit, and every move past it is still answered.
  const beforeBurst = snapshot.players.a.y;
  a.emitted.length = 0;
  for (let i = 0; i < 12; i++) await a.send('world:move', { dx: 0, dy: 1 });
  const accepted = (snapshot.players.a.y - beforeBurst) / 10;
  assert.ok(accepted >= 1 && accepted <= 4, `accepted ${accepted} moves`);
  assert.equal(a.emitted.filter(e => e.event === 'world:moved').length, 12 - accepted);
  const film = { source: 'phimapi', slug: 'ten-phim', server: 0, episode: 'tap-1', playing: true, position: 30 };
  type Shared = typeof film & { host: string; hostName: string };
  const latest = () => screenings().at(-1) as Shared;
  await a.send('world:screening:start', film);
  assert.equal(screenings().length, 0, 'a screening must be started at the cinema');
  Object.assign(snapshot.players.a, { x: 805, y: 250 });
  for (const bad of [{ ...film, slug: '../admin' }, { ...film, episode: '<b>' }, { ...film, server: -1 }, { ...film, server: 1.5 }, { ...film, slug: 1 }, { ...film, source: 'evil' }, { ...film, playing: 'yes' }, { ...film, position: -1 }, { ...film, position: Infinity }]) await a.send('world:screening:start', bad);
  assert.equal(screenings().length, 0, 'malformed films are rejected');
  await a.send('world:screening:start', { ...film, name: 'spam', embed: 'https://evil.example' });
  assert.deepEqual(Object.keys(latest()).sort(), ['episode', 'host', 'hostName', 'playing', 'position', 'server', 'slug', 'source'], 'only ids and playback are shared, never text or URLs');
  assert.equal(latest().host, 'a');
  await a.send('world:screening:start', { ...film, episode: 'tap-2' });
  assert.equal(screenings().length, 1, 'restarting is rate limited');
  Object.assign(snapshot.players.b, { x: 805, y: 250 });
  await b.send('world:screening:start', { ...film, slug: 'phim-khac' });
  assert.equal(screenings().length, 1, 'another player cannot take over');
  assert.ok(b.emitted.some(e => e.event === 'world:notice'));
  await b.send('world:screening:stop');
  await b.send('world:screening:sync', { playing: false, position: 1 });
  assert.equal(screenings().length, 1, 'another player cannot stop or steer it');
  // The host's clock moves everyone, and a late joiner lands on the moment being shown.
  await delay(120);
  await a.send('world:screening:sync', { playing: true, position: Infinity });
  assert.equal(screenings().length, 1, 'malformed positions are rejected');
  await a.send('world:screening:sync', { playing: false, position: 100 });
  assert.deepEqual([latest().playing, latest().position], [false, 100]);
  await a.send('world:screening:sync', { playing: true, position: 200 });
  assert.equal(latest().position, 100, 'sync messages are rate limited');
  await delay(120);
  await a.send('world:screening:sync', { playing: true, position: 200 });
  await delay(300);
  const late = client('late');
  await late.send('world:join');
  const seen = (late.emitted.find(e => e.event === 'world:snapshot')?.payload as { screening: Shared }).screening;
  assert.ok(seen.position >= 200.25 && seen.position < 201, `late joiner sees ${seen.position}`);
  await late.send('disconnect');
  await a.send('disconnect');
  assert.equal(screenings().at(-1), null, 'a screening ends when its host leaves');
  await b.send('disconnect');
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
