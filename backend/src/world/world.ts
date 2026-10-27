import type { Server, Socket } from 'socket.io';
import type { PrismaClient } from '@prisma/client';
import { QUESTIONS, step, TABLES, SIZE, BLOCKS, TREE_TRUNKS } from './rules';
import { randomUUID } from 'node:crypto';
import { FloorGame } from './floor';
import { defaultAppearance, onAppearanceSaved, type Appearance } from './appearance';
import { prismaProfileStore } from './profile.store';

type Player = { id: string; username: string; x: number; y: number; color: string; table?: string; facing?:string; appearance: Appearance };
type Member = { socket: Socket; player: Player; moved: number; chatted: number; emoted: number };
type Game = { phase: 'waiting' | 'question' | 'results'; players: Set<string>; scores: Record<string, number>; answered: Set<string>; index: number; round: string; endsAt: number; timer?: ReturnType<typeof setTimeout> };
type Room = { id: string; members: Map<string, Member>; game: Game; floor: FloorGame };
const colors = ['#fb7185', '#a78bfa', '#38bdf8', '#fbbf24', '#34d399'];
const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' ? v as Record<string, unknown> : {};

export function initWorld(io: Server, prisma: PrismaClient) {
  const rooms = new Map<string, Room>();
  const memberships = new Map<string, Room>();
  const pending = new Map<string, symbol>();
  const profiles = prisma.worldProfile ? prismaProfileStore(prisma) : null;
  const unsubscribe = onAppearanceSaved((userId, appearance) => {
    for (const room of rooms.values()) for (const [id, member] of room.members) {
      if (member.player.id !== userId) continue;
      member.player.appearance = appearance;
      io.to(room.id).emit('world:appearance', { id, appearance });
    }
  });
  io.engine?.once('close', unsubscribe);
  const gameState = (room: Room) => {
    const g = room.game;
    const q = QUESTIONS[g.index];
    return { phase: g.phase, round: g.round, endsAt: g.endsAt, participants: [...g.players], scores: g.phase === 'results' ? g.scores : {},
      question: g.phase === 'question' ? { text: q.text, options: q.options, number: g.index + 1, total: QUESTIONS.length } : null };
  };
  const broadcastGame = (room: Room) => io.to(room.id).emit('world:game', gameState(room));
  function advance(room: Room) {
    const g = room.game;
    if (!rooms.has(room.id)) return;
    g.index++;
    g.answered.clear();
    if (g.index >= QUESTIONS.length) {
      g.phase = 'results'; g.endsAt = 0;
      broadcastGame(room);
      return;
    }
    g.phase = 'question'; g.endsAt = Date.now() + 12_000;
    g.round = randomUUID();
    broadcastGame(room);
    g.timer = setTimeout(() => advance(room), 12_000);
  }
  function leave(socket: Socket) {
    const room = memberships.get(socket.id);
    if (!room) return;
    memberships.delete(socket.id);
    room.members.delete(socket.id);
    room.game.players.delete(socket.id);
    room.floor.leave(socket.id);
    delete room.game.scores[socket.id];
    socket.leave(room.id);
    io.to(room.id).emit('world:left', socket.id);
    if (!room.members.size) {
      clearTimeout(room.game.timer); room.floor.dispose(); rooms.delete(room.id);
    } else if (room.game.players.size < 2 && room.game.phase === 'question') {
      clearTimeout(room.game.timer); room.game.phase = 'results'; room.game.endsAt = 0;
    }
    broadcastGame(room);
  }

  io.on('connection', socket => {
    socket.on('world:join', async (payload: unknown) => {
      if (memberships.has(socket.id) || pending.has(socket.id)) return;
      const ticket = Symbol('world join');
      pending.set(socket.id, ticket);
      try {
        const userId = (socket as Socket & { userId: string }).userId;
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } });
        const appearance = user ? await profiles?.read(userId) ?? defaultAppearance(userId) : null;
        if (!socket.connected || pending.get(socket.id) !== ticket) return;
        if (!user) { socket.emit('world:error', 'Tài khoản không còn tồn tại. Hãy đăng nhập lại.'); return; }
        // One world presence per account, including multiple browser tabs.
        for (const room of rooms.values()) for (const member of room.members.values()) {
          if (member.player.id === user.id) {
            member.socket.emit('world:error', 'Z4world đã được mở ở một cửa sổ khác.');
            leave(member.socket);
          }
        }
        const requested = record(payload).roomId;
        let room = typeof requested === 'string' ? rooms.get(requested) : undefined;
        if (room && room.members.size >= 20) {
          socket.emit('world:error', 'Sảnh bạn được mời đã đầy. Hãy vào sảnh khác.'); return;
        }
        room ??= [...rooms.values()].find(r => r.members.size < 20);
        if (!room) {
          const id = `world:${randomUUID().slice(0, 8)}`;
          room = { id, members: new Map(), game: { phase: 'waiting', players: new Set(), scores: {}, answered: new Set(), index: -1, round: '', endsAt: 0 }, floor: new FloorGame(state => io.to(id).emit('world:floor', state)) };
          rooms.set(room.id, room);
        }
        const slots = Array.from({ length: 20 }, (_, i) => ({ x: 350+(i%5)*34, y: 440+Math.floor(i/5)*32 }));
        const spawn = slots.find(p => [...room.members.values()].every(m => Math.hypot(m.player.x-p.x, m.player.y-p.y) > 26)) ?? slots[room.members.size];
        const player: Player = { ...user, ...spawn, appearance: appearance!, color: colors[room.members.size % colors.length] };
        room.members.set(socket.id, { socket, player, moved: 0, chatted: 0, emoted: 0 });
        memberships.set(socket.id, room);
        await socket.join(room.id);
        if (memberships.get(socket.id) !== room) return;
        socket.emit('world:snapshot', { roomId: room.id, self: socket.id, geometry:{...SIZE,blocks:BLOCKS,trunks:TREE_TRUNKS}, players: Object.fromEntries([...room.members].map(([id, m]) => [id, m.player])), game: gameState(room), floor: room.floor.state() });
        socket.to(room.id).emit('world:joined', { id: socket.id, player });
      } catch {
        if (pending.get(socket.id) === ticket) {
          leave(socket);
          socket.emit('world:error', 'Không thể vào thế giới. Hãy thử kết nối lại.');
        }
      } finally { if (pending.get(socket.id) === ticket) pending.delete(socket.id); }
    });
    socket.on('world:leave', () => { pending.delete(socket.id); leave(socket); });
    socket.on('disconnect', () => { pending.delete(socket.id); leave(socket); });
    socket.on('world:move', (value: unknown) => {
      const room = memberships.get(socket.id), m = room?.members.get(socket.id);
      if (!room || !m || Date.now() - m.moved < 45) return;
      const { dx, dy } = record(value);
      if (typeof dx !== 'number' || typeof dy !== 'number' || !Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) > 1 || Math.abs(dy) > 1) return;
      m.moved = Date.now();
      if (m.player.table) return;
      Object.assign(m.player, step(m.player.x, m.player.y, dx, dy));
      io.to(room.id).emit('world:moved', { id: socket.id, x: m.player.x, y: m.player.y });
    });
    socket.on('world:chat', (value: unknown) => {
      const room = memberships.get(socket.id), m = room?.members.get(socket.id);
      const input = record(value);
      const content = typeof value === 'string' ? value : input.text;
      const tableOnly = input.scope === 'table';
      if (!room || !m || typeof content !== 'string' || !content.trim() || content.length > 200 || Date.now() - m.chatted < 1500 || (tableOnly && !m.player.table)) return;
      m.chatted = Date.now();
      const message = { id: `${socket.id}:${m.chatted}`, from: socket.id, username: m.player.username, text: content.trim(), scope: tableOnly ? 'table' : 'nearby', at: m.chatted };
      for (const target of room.members.values()) {
        const deliver = tableOnly ? target.player.table === m.player.table : Math.hypot(target.player.x - m.player.x, target.player.y - m.player.y) <= 250;
        if (deliver) target.socket.emit('world:chat', message);
      }
    });
    socket.on('world:emote', (value: unknown) => {
      const room = memberships.get(socket.id), m = room?.members.get(socket.id);
      if (!room || !m || typeof value !== 'string' || !['👋', '❤️', '😂', '🎉'].includes(value) || Date.now() - m.emoted < 1000) return;
      m.emoted = Date.now();
      io.to(room.id).emit('world:emote', { id: socket.id, emote: value });
    });
    socket.on('world:sit', (value: unknown) => {
      const room = memberships.get(socket.id), m = room?.members.get(socket.id);
      if (!room || !m || m.player.table) return;
      const table = TABLES.find(t => t.id === value);
      if (!table || Math.hypot(m.player.x-table.x, m.player.y-table.y) > 85) return;
      const seated = [...room.members.values()].filter(p => p.player.table === table.id);
      if (seated.length >= 2) return socket.emit('world:notice', 'Bàn đã đủ hai người.');
      const x = seated.some(p => p.player.x < table.x) ? table.x + 40 : table.x - 40;
      Object.assign(m.player, { table: table.id, x, y: table.y, facing:x<table.x?'front-right':'back-left' });
      io.to(room.id).emit('world:joined', { id: socket.id, player: m.player });
    });
    socket.on('world:stand', () => {
      const room = memberships.get(socket.id), m = room?.members.get(socket.id);
      if (!room || !m || !m.player.table) return;
      delete m.player.table;
      io.to(room.id).emit('world:joined', { id: socket.id, player: m.player });
    });
    socket.on('world:quiz:leave', () => {
      const room = memberships.get(socket.id);
      if (!room || room.game.phase === 'question') return;
      room.game.players.delete(socket.id); delete room.game.scores[socket.id]; broadcastGame(room);
    });
    socket.on('world:floor:join', () => {
      const room = memberships.get(socket.id), m = room?.members.get(socket.id);
      if (room && m && m.player.x >= 650 && m.player.y <= 300 && !(room.game.phase !== 'results' && room.game.players.has(socket.id))) room.floor.join(socket.id);
    });
    socket.on('world:floor:move', (value: unknown) => memberships.get(socket.id)?.floor.move(socket.id, value));
    socket.on('world:floor:leave', () => memberships.get(socket.id)?.floor.leave(socket.id));
    socket.on('world:quiz:join', () => {
      const room = memberships.get(socket.id), m = room?.members.get(socket.id);
      if (!room || !m || m.player.x < 650 || m.player.y > 300 || room.game.phase === 'question' || room.floor.has(socket.id)) return;
      const g = room.game;
      if (g.phase === 'results') { g.phase = 'waiting'; g.players.clear(); g.scores = {}; }
      g.players.add(socket.id); g.scores[socket.id] = 0;
      if (g.players.size >= 2) { g.index = -1; advance(room); }
      else broadcastGame(room);
    });
    socket.on('world:quiz:answer', (value: unknown) => {
      const room = memberships.get(socket.id);
      if (!room) return;
      const g = room.game;
      const input = record(value);
      const answer = input.answer;
      if (g.phase !== 'question' || input.round !== g.round || Date.now() >= g.endsAt || !g.players.has(socket.id) || g.answered.has(socket.id) || !Number.isInteger(answer) || Number(answer) < 0 || Number(answer) > 3) return;
      g.answered.add(socket.id);
      if (answer === QUESTIONS[g.index].answer) g.scores[socket.id] += 100;
      socket.emit('world:quiz:accepted', g.round);
      // Do not reveal correctness or scores until the match ends.
    });
  });
}
