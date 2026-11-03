import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server, Socket } from 'socket.io';
import type { PrismaClient } from '@prisma/client';
import { initTheater } from '../src/theater/theater';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const film = { source: 'phimapi', slug: 'ten-phim', server: 0, episode: 'tap-1' };
type Playback = typeof film & { hostId: string; hostName: string; hostAway: boolean; playing: boolean; position: number };

function setup(options = {}) {
  let connect: (socket: Socket) => void = () => {};
  const broadcasts: { event: string; payload: unknown }[] = [];
  const io = { on: (_event: string, handler: typeof connect) => { connect = handler; }, to: () => ({ emit: (event: string, payload: unknown) => broadcasts.push({ event, payload }) }) };
  const prisma = { user: { findUnique: async ({ where }: { where: { id: string } }) => ({ username: where.id }) } };
  initTheater(io as unknown as Server, prisma as unknown as PrismaClient, { hostGraceMs: 30, emptyRoomMs: 60, ...options });
  let sockets = 0;
  function client(userId: string) {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const emitted: { event: string; payload: unknown }[] = [];
    const socket = { id: `socket-${++sockets}`, userId, connected: true, on: (event: string, handler: (...args: unknown[]) => unknown) => handlers.set(event, handler),
      emit: (event: string, payload: unknown) => emitted.push({ event, payload }), join: async () => {}, leave: () => {}, to: () => ({ emit: (event: string, payload: unknown) => broadcasts.push({ event, payload }) }) };
    connect(socket as unknown as Socket);
    return {
      emitted,
      send: async (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
      create: (value: unknown) => new Promise<{ roomId?: string; error?: string }>(resolve => { void handlers.get('theater:create')?.(value, resolve); }),
      last: <T>(event: string) => emitted.filter(e => e.event === event).at(-1)?.payload as T,
    };
  }
  const shared = () => broadcasts.filter(e => e.event === 'theater:playback').map(e => e.payload as Playback);
  return { client, shared, broadcasts };
}
const open = async (host: ReturnType<ReturnType<typeof setup>['client']>) => {
  const { roomId } = await host.create(film);
  assert.ok(roomId);
  await host.send('theater:join', { roomId });
  return roomId!;
};

test('malformed films are rejected and only ids are stored', async () => {
  const { client } = setup();
  const host = client('host');
  for (const bad of [{ ...film, slug: '../admin' }, { ...film, episode: '<b>' }, { ...film, server: -1 }, { ...film, server: 1.5 }, { ...film, slug: 1 }, { ...film, source: 'evil' }, null, 'x']) assert.ok((await host.create(bad)).error);
  const roomId = (await host.create({ ...film, name: 'spam', embed: 'https://evil.example' })).roomId;
  await host.send('theater:join', { roomId });
  const { playback } = host.last<{ playback: Playback }>('theater:snapshot');
  assert.deepEqual(Object.keys(playback).sort(), ['episode', 'hostAway', 'hostId', 'hostName', 'playing', 'position', 'server', 'slug', 'source']);
});

test('creating rooms is rate limited, and unknown rooms report missing', async () => {
  const { client } = setup();
  const host = client('host');
  assert.ok((await host.create(film)).roomId);
  assert.match((await host.create(film)).error ?? '', /vừa tạo/);
  await host.send('theater:join', { roomId: 'khong-co' });
  assert.ok(host.emitted.some(e => e.event === 'theater:missing'));
});

test('only the host steers, and late joiners land on the moment being shown', async () => {
  const { client, shared } = setup();
  const host = client('host'), viewer = client('viewer');
  const roomId = await open(host);
  await viewer.send('theater:join', { roomId });
  assert.equal(viewer.last<{ self: string }>('theater:snapshot').self, 'viewer');
  const start = shared().length;
  await viewer.send('theater:sync', { playing: true, position: 99 });
  await viewer.send('theater:film', { ...film, slug: 'phim-khac', playing: true, position: 0 });
  assert.equal(shared().length, start, 'a viewer cannot steer');
  await host.send('theater:sync', { playing: true, position: Infinity });
  assert.equal(shared().length, start, 'malformed positions are rejected');
  await host.send('theater:sync', { playing: true, position: 200 });
  await host.send('theater:sync', { playing: false, position: 1 });
  assert.equal(shared().length, start + 1, 'sync messages are rate limited');
  await delay(150);
  const late = client('late');
  await late.send('theater:join', { roomId });
  const seen = late.last<{ playback: Playback }>('theater:snapshot').playback;
  assert.ok(seen.position >= 200.14 && seen.position < 201, `late joiner sees ${seen.position}`);
  await host.send('theater:film', { ...film, episode: 'tap-2', playing: true, position: 0 });
  assert.equal(shared().at(-1)?.episode, 'tap-2');
  await host.send('theater:film', { ...film, episode: 'tap-3', playing: true, position: 0 });
  await host.send('theater:film', { ...film, episode: 'tap-4', playing: true, position: 0 });
  assert.equal(shared().at(-1)?.episode, 'tap-2', 'changing film is rate limited');
  await delay(1050);
  assert.equal(shared().at(-1)?.episode, 'tap-4', 'the latest change still applies, so a dead stream is left behind');
});

test('a host who reloads keeps the seat and the room waits for them', async () => {
  const { client, shared } = setup({ hostGraceMs: 200 });
  const host = client('host'), viewer = client('viewer');
  const roomId = await open(host);
  await viewer.send('theater:join', { roomId });
  await host.send('theater:sync', { playing: true, position: 50 });
  await host.send('disconnect');
  assert.deepEqual([shared().at(-1)?.hostAway, shared().at(-1)?.playing, shared().at(-1)?.hostId], [true, false, 'host']);
  const back = client('host');
  await back.send('theater:join', { roomId });
  assert.deepEqual([shared().at(-1)?.hostAway, shared().at(-1)?.hostId], [false, 'host']);
  await delay(260);
  assert.equal(shared().at(-1)?.hostId, 'host', 'the seat is not passed after they return');
});

test('the seat passes on when the host leaves or stays away', async () => {
  const { client, shared } = setup();
  const host = client('host'), viewer = client('viewer');
  const roomId = await open(host);
  await viewer.send('theater:join', { roomId });
  await host.send('theater:leave');
  assert.deepEqual([shared().at(-1)?.hostId, shared().at(-1)?.hostAway], ['viewer', false], 'leaving passes it at once');
  await host.send('theater:join', { roomId });
  await viewer.send('disconnect');
  assert.equal(shared().at(-1)?.hostAway, true);
  await delay(50);
  assert.equal(shared().at(-1)?.hostId, 'host', 'staying away passes it after the grace period');
});

test('an empty room closes after a while, and can be rejoined until then', async () => {
  const { client } = setup({ emptyRoomMs: 40 });
  const host = client('host');
  const roomId = await open(host);
  await host.send('theater:leave');
  const quick = client('quick');
  await quick.send('theater:join', { roomId });
  assert.ok(quick.last('theater:snapshot'));
  await quick.send('theater:leave');
  await delay(70);
  const late = client('late');
  await late.send('theater:join', { roomId });
  assert.ok(late.emitted.some(e => e.event === 'theater:missing'));
});

test('one seat per account, a room holds 20, and chat is validated', async () => {
  const { client, broadcasts } = setup();
  const host = client('host');
  const roomId = await open(host);
  const tab = client('host');
  await tab.send('theater:join', { roomId });
  assert.match(host.last<string>('theater:error'), /cửa sổ khác/);
  for (let i = 0; i < 19; i++) await client(`u${i}`).send('theater:join', { roomId });
  const extra = client('extra');
  await extra.send('theater:join', { roomId });
  assert.match(extra.last<string>('theater:error'), /20 người/);
  const said = () => broadcasts.filter(e => e.event === 'theater:chat').length;
  await tab.send('theater:chat', '   ');
  await tab.send('theater:chat', 'x'.repeat(201));
  await tab.send('theater:chat', { text: 'object' });
  await extra.send('theater:chat', 'not in the room');
  assert.equal(said(), 0);
  await tab.send('theater:chat', ' hay quá ');
  await tab.send('theater:chat', 'liên tục');
  assert.equal(said(), 1, 'chat is rate limited');
  assert.equal((broadcasts.find(e => e.event === 'theater:chat')?.payload as { text: string }).text, 'hay quá');
});

test('a cancelled async join cannot take a seat', async () => {
  const { client } = setup();
  const host = client('host');
  const { roomId } = await host.create(film);
  const viewer = client('viewer');
  const joining = viewer.send('theater:join', { roomId });
  await viewer.send('theater:leave');
  await joining;
  assert.equal(viewer.last('theater:snapshot'), undefined);
});
