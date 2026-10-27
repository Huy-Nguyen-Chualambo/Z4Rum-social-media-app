/** Local-only E2E fixture: real authentication and Socket.IO, isolated fake users.
 * Never mounted by src/server.ts and never connects to the project database.
 */
import express from "express";
import cors from "cors";
import http from "node:http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { profileRoutes, prismaProfileStore } from "../src/world/profile.routes";
import { publishAppearance } from "../src/world/appearance";
import { errorHandler } from "../src/middleware/errorHandler";
import { initSocket } from "../src/socket";
import { authMiddleware, signToken } from "../src/utils/jwt";

const users = new Map(
  Array.from({ length: 25 }, (_, i) => {
    const id = `world-test-${i}`;
    return [
      id,
      {
        id,
        username: `Tester${i}`,
        email: `${id}@example.test`,
        gender: "male",
      },
    ];
  }),
);
const database = process.env.WORLD_TEST_DATABASE_URL;
if (
  database &&
  !database.startsWith(
    "postgresql://postgres:z4world-local-test@127.0.0.1:55432/z4world_test",
  )
)
  throw new Error("Only the isolated local test database is allowed");
const prisma = database
  ? new PrismaClient({ datasourceUrl: database })
  : ({
      user: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          users.get(where.id) || null,
      },
    } as unknown as PrismaClient);
const app = express();
app.use(cors());
app.use(express.json());
if (database)
  app.use(
    "/world",
    profileRoutes(prismaProfileStore(prisma), publishAppearance),
  );
app.get("/fixture/login/:id", (req, res) => {
  const user = users.get(`world-test-${req.params.id}`);
  if (!user) return res.sendStatus(404);
  res.json({ token: signToken({ id: user.id }), user });
});
app.get("/auth/me", authMiddleware, (req, res) => {
  const user = users.get((req as express.Request & { userId: string }).userId);
  if (!user) return res.sendStatus(401);
  res.json(user);
});
app.get("/z4chat/unread", authMiddleware, (_req, res) =>
  res.json({ total: 0, sessions: 0 }),
);
app.get("/z4chat/proactive/due", authMiddleware, (_req, res) => res.json([]));
app.use(errorHandler);
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3300" } });
initSocket(io, prisma);
async function start() {
  if (database)
    for (const user of users.values())
      await prisma.user.upsert({
        where: { id: user.id },
        create: user,
        update: {},
      });
  server.listen(4400, "127.0.0.1", () =>
    console.log(
      `World test fixture: http://127.0.0.1:4400 (${database ? "isolated PostgreSQL" : "in-memory users"})`,
    ),
  );
}
start().catch((error) => {
  console.error(error);
  process.exit(1);
});
process.on("SIGTERM", () => io.close(() => process.exit(0)));
