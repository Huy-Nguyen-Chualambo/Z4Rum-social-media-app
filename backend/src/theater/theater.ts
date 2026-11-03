import type { Server, Socket } from 'socket.io';
import type { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';

const MOVIE_ID = /^[\w-]{1,120}$/;
const SOURCES = ['phimapi', 'nguonc'];
const MAX_MEMBERS = 20;
const MAX_ROOMS = 200;
const MAX_POSITION = 86_400;
const FILM_CHANGE_MS = 1000;

type Film = { source: string; slug: string; server: number; episode: string };
type Member = { socket: Socket; userId: string; username: string; chatted: number };
type Room = {
  id: string;
  channel: string;
  members: Map<string, Member>;
  film: Film;
  hostId: string;
  hostName: string;
  hostAway: boolean;
  playing: boolean;
  position: number;
  at: number;
  changed: number;
  synced: number;
  hostTimer?: ReturnType<typeof setTimeout>;
  filmTimer?: ReturnType<typeof setTimeout>;
  closeTimer?: ReturnType<typeof setTimeout>;
};

const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' ? v as Record<string, unknown> : {};
const validPosition = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_POSITION;
// Only ids are shared: every viewer looks the film up itself, so no one can push text or a player URL.
function parseFilm(value: unknown): Film | null {
  const { source, slug, server, episode } = record(value);
  if (typeof source !== 'string' || !SOURCES.includes(source) || typeof slug !== 'string' || !MOVIE_ID.test(slug) || typeof episode !== 'string' || !MOVIE_ID.test(episode) || !Number.isInteger(server) || Number(server) < 0 || Number(server) > 50) return null;
  return { source, slug, server: Number(server), episode };
}
const livePosition = (room: Room) => room.playing ? room.position + (Date.now() - room.at) / 1000 : room.position;

export function initTheater(io: Server, prisma: PrismaClient, { hostGraceMs = 15_000, emptyRoomMs = 60_000 } = {}) {
  const rooms = new Map<string, Room>();
  const memberships = new Map<string, Room>();
  const pending = new Map<string, symbol>();
  const created = new Map<string, number>();

  /** What viewers receive: the position right now, so a late joiner lands on the right moment. */
  const playback = (room: Room) => ({ ...room.film, hostId: room.hostId, hostName: room.hostName, hostAway: room.hostAway, playing: room.playing, position: livePosition(room) });
  const members = (room: Room) => [...room.members.values()].map(({ userId, username }) => ({ userId, username }));
  const sendPlayback = (room: Room) => io.to(room.channel).emit('theater:playback', playback(room));
  function close(room: Room) {
    clearTimeout(room.hostTimer);
    clearTimeout(room.closeTimer);
    clearTimeout(room.filmTimer);
    rooms.delete(room.id);
  }
  function passHost(room: Room) {
    clearTimeout(room.hostTimer);
    const next = room.members.values().next().value;
    if (!next) return;
    room.hostId = next.userId;
    room.hostName = next.username;
    room.hostAway = false;
    sendPlayback(room);
  }
  function leave(socket: Socket, stayingHost: boolean) {
    const room = memberships.get(socket.id);
    if (!room) return;
    const member = room.members.get(socket.id);
    memberships.delete(socket.id);
    room.members.delete(socket.id);
    socket.leave(room.channel);
    io.to(room.channel).emit('theater:members', members(room));
    if (member?.userId === room.hostId) {
      // Nobody can see the host's picture now, so the room waits instead of running on.
      room.position = livePosition(room);
      room.playing = false;
      room.at = Date.now();
      if (stayingHost) {
        // A reload or a dropped connection keeps the seat for a moment.
        room.hostAway = true;
        sendPlayback(room);
        clearTimeout(room.hostTimer);
        room.hostTimer = setTimeout(() => passHost(room), hostGraceMs);
      } else {
        room.hostAway = true;
        passHost(room);
      }
    }
    if (!room.members.size) {
      clearTimeout(room.closeTimer);
      room.closeTimer = setTimeout(() => close(room), emptyRoomMs);
    }
  }

  io.on('connection', socket => {
    const userId = (socket as Socket & { userId: string }).userId;
    socket.on('theater:create', async (value: unknown, reply: unknown) => {
      if (typeof reply !== 'function') return;
      const film = parseFilm(value);
      if (!film) return reply({ error: 'Phim không hợp lệ.' });
      if (Date.now() - (created.get(userId) ?? 0) < 2000) return reply({ error: 'Bạn vừa tạo phòng, hãy thử lại sau giây lát.' });
      if (rooms.size >= MAX_ROOMS) return reply({ error: 'Rạp đang kín phòng. Hãy thử lại sau.' });
      try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
        if (!user) return reply({ error: 'Tài khoản không còn tồn tại. Hãy đăng nhập lại.' });
        created.set(userId, Date.now());
        const id = randomBytes(9).toString('base64url');
        const room: Room = { id, channel: `theater:${id}`, members: new Map(), film, hostId: userId, hostName: user.username, hostAway: false, playing: false, position: 0, at: Date.now(), changed: 0, synced: 0 };
        // A room nobody ever enters must not linger.
        room.closeTimer = setTimeout(() => close(room), emptyRoomMs);
        rooms.set(id, room);
        reply({ roomId: id });
      } catch {
        reply({ error: 'Không tạo được phòng. Hãy thử lại.' });
      }
    });
    socket.on('theater:join', async (value: unknown) => {
      if (memberships.has(socket.id) || pending.has(socket.id)) return;
      const ticket = Symbol('theater join');
      pending.set(socket.id, ticket);
      try {
        const roomId = record(value).roomId;
        const room = typeof roomId === 'string' ? rooms.get(roomId) : undefined;
        if (!room) return void socket.emit('theater:missing');
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
        if (!socket.connected || pending.get(socket.id) !== ticket) return;
        if (!user) return void socket.emit('theater:error', 'Tài khoản không còn tồn tại. Hãy đăng nhập lại.');
        if (!rooms.has(room.id)) return void socket.emit('theater:missing');
        // One seat per account, including multiple browser tabs.
        for (const other of rooms.values()) for (const member of other.members.values()) {
          if (member.userId !== userId) continue;
          member.socket.emit('theater:error', 'Bạn đã vào phòng ở một cửa sổ khác.');
          leave(member.socket, other === room);
        }
        if (room.members.size >= MAX_MEMBERS) return void socket.emit('theater:error', 'Phòng đã đủ 20 người.');
        room.members.set(socket.id, { socket, userId, username: user.username, chatted: 0 });
        memberships.set(socket.id, room);
        clearTimeout(room.closeTimer);
        if (room.hostId === userId) {
          clearTimeout(room.hostTimer);
          room.hostAway = false;
        }
        await socket.join(room.channel);
        if (memberships.get(socket.id) !== room) return;
        socket.emit('theater:snapshot', { roomId: room.id, self: userId, members: members(room), playback: playback(room) });
        socket.to(room.channel).emit('theater:members', members(room));
        if (room.hostId === userId) socket.to(room.channel).emit('theater:playback', playback(room));
      } catch {
        socket.emit('theater:error', 'Không vào được phòng. Hãy thử lại.');
      } finally {
        if (pending.get(socket.id) === ticket) pending.delete(socket.id);
      }
    });
    socket.on('theater:leave', () => { pending.delete(socket.id); leave(socket, false); });
    socket.on('disconnect', () => { pending.delete(socket.id); leave(socket, true); });
    socket.on('theater:film', (value: unknown) => {
      const room = memberships.get(socket.id);
      const film = parseFilm(value);
      const { playing, position } = record(value);
      if (!room || !film || room.hostId !== userId || typeof playing !== 'boolean' || !validPosition(position)) return;
      const apply = () => {
        if (room.hostId !== userId) return;
        room.changed = Date.now();
        Object.assign(room, { film, playing, position, at: room.changed });
        sendPlayback(room);
      };
      // Too soon is delayed, never dropped: this may be a move away from a dead stream.
      clearTimeout(room.filmTimer);
      const wait = FILM_CHANGE_MS - (Date.now() - room.changed);
      if (wait > 0) room.filmTimer = setTimeout(apply, wait);
      else apply();
    });
    socket.on('theater:sync', (value: unknown) => {
      const room = memberships.get(socket.id);
      const { playing, position } = record(value);
      if (!room || room.hostId !== userId || typeof playing !== 'boolean' || !validPosition(position) || Date.now() - room.synced < 100) return;
      room.synced = Date.now();
      Object.assign(room, { playing, position, at: room.synced });
      sendPlayback(room);
    });
    socket.on('theater:chat', (value: unknown) => {
      const room = memberships.get(socket.id), member = room?.members.get(socket.id);
      if (!room || !member || typeof value !== 'string' || !value.trim() || value.length > 200 || Date.now() - member.chatted < 1000) return;
      member.chatted = Date.now();
      io.to(room.channel).emit('theater:chat', { id: `${socket.id}:${member.chatted}`, from: userId, username: member.username, text: value.trim(), at: member.chatted });
    });
  });
}
