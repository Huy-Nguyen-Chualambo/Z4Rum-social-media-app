/** Local-only E2E fixture: real authentication and Socket.IO, isolated fake users.
 * Never mounted by src/server.ts and never connects to the project database.
 */
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server } from 'socket.io';
import type { PrismaClient } from '@prisma/client';
import { initSocket } from '../src/socket';
import { authMiddleware, signToken } from '../src/utils/jwt';

const users = new Map(Array.from({ length: 25 }, (_, i) => {
  const id = `world-test-${i}`;
  return [id, { id, username: `Tester${i}`, email: `${id}@example.test`, gender: 'male' }];
}));
const prisma = { user: { findUnique: async ({ where }: { where: { id: string } }) => users.get(where.id) || null } } as unknown as PrismaClient;
const app = express();
app.use(cors());
app.get('/fixture/login/:id', (req, res) => {
  const user = users.get(`world-test-${req.params.id}`);
  if (!user) return res.sendStatus(404);
  res.json({ token: signToken({ id: user.id }), user });
});
app.get('/auth/me', authMiddleware, (req, res) => {
  const user = users.get((req as express.Request & { userId: string }).userId);
  if (!user) return res.sendStatus(401);
  res.json(user);
});
app.get('/z4chat/unread', authMiddleware, (_req, res) => res.json({ total: 0, sessions: 0 }));
app.get('/z4chat/proactive/due', authMiddleware, (_req, res) => res.json([]));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:3300' } });
initSocket(io, prisma);
server.listen(4400, '127.0.0.1', () => console.log('World test fixture: http://127.0.0.1:4400'));
process.on('SIGTERM', () => io.close(() => process.exit(0)));
