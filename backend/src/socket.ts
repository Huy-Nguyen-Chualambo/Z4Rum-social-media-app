import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "./utils/jwt";
import { MatchService } from "./services/matchService";

export function initSocket(io: Server, prisma: PrismaClient) {
  const matchService = new MatchService(prisma);
  // Store user's match mode
  const userMatchMode = new Map<string, "normal" | "opposite">();

  io.use((socket, next) => {
    try {
      const token = (socket.handshake.auth as any)?.token || (socket.handshake.query as any)?.token;
      if (!token) return next(new Error("Unauthorized"));
      const decoded = verifyToken(token);
      (socket as any).userId = decoded.id;
      next();
    } catch (e) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId: string = (socket as any).userId;

    // Join personal room for direct messages
    socket.join(`user:${userId}`);

    socket.on("match:join", async (payload: unknown) => {
      try {
        const requestedMode = objectPayload(payload).mode;
        const mode = requestedMode || "normal";
        if (mode !== "normal" && mode !== "opposite") {
          return socket.emit("error", { code: "INVALID_INPUT", message: "Invalid match mode" });
        }
        userMatchMode.set(userId, mode);
        const session = await matchService.join(userId, mode);
        if (session) {
          const room = `session:${session.id}`;
          socket.join(room);
          
          // Get both users' info (anonymous - only show username and avatar)
          const [userA, userB] = await Promise.all([
            prisma.user.findUnique({
              where: { id: session.userAId },
              select: { id: true, username: true, avatarUrl: true },
            }),
            prisma.user.findUnique({
              where: { id: session.userBId },
              select: { id: true, username: true, avatarUrl: true },
            }),
          ]);
          
          const peers = io.sockets.sockets;
          for (const [, s] of peers) {
            if ((s as any).userId === session.userAId || (s as any).userId === session.userBId) {
              s.join(room);
              const otherPeer = (s as any).userId === session.userAId ? userB : userA;
              s.emit("match:found", {
                sessionId: session.id,
                peer: otherPeer,
              });
            }
          }
          userMatchMode.delete(userId);
        } else {
          socket.emit("match:queueStatus", { position: 1 });
        }
      } catch (error: any) {
        socket.emit("error", { code: "MATCH_ERROR", message: error.message });
        userMatchMode.delete(userId);
      }
    });

    socket.on("match:leave", async () => {
      try {
        const mode = userMatchMode.get(userId) || "normal";
        await matchService.leave(userId, mode);
        userMatchMode.delete(userId);
      } catch {
        socket.emit("error", { code: "MATCH_ERROR", message: "Could not leave queue" });
      }
    });

    socket.on("message:send", async (payload: unknown) => {
      const { sessionId, content } = objectPayload(payload);
      if (!sessionId || !content?.trim() || content.length > 4000) {
        return socket.emit("error", { code: "INVALID_INPUT", message: "Invalid message" });
      }
      const session = await activeMemberSession(prisma, sessionId, userId);
      if (!session) return socket.emit("error", { code: "FORBIDDEN", message: "Session not found" });
      socket.join(`session:${sessionId}`);
      const message = await prisma.message.create({
        data: { content: content.trim(), senderId: userId, sessionId },
      });
      io.to(`session:${sessionId}`).emit("message:receive", {
        id: message.id,
        sessionId,
        from: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
      });
    });

    socket.on("session:end", async (payload: unknown) => {
      const { sessionId, reason } = objectPayload(payload);
      if (!sessionId || !(await activeMemberSession(prisma, sessionId, userId))) {
        return socket.emit("error", { code: "FORBIDDEN", message: "Session not found" });
      }
      await matchService.end(sessionId);
      io.to(`session:${sessionId}`).emit("session:ended", { sessionId, by: userId, reason: reason?.slice(0, 200) });
    });

    socket.on("session:report", async (payload: unknown) => {
      const { sessionId, offenderId, reason } = objectPayload(payload);
      const session = sessionId ? await activeMemberSession(prisma, sessionId, userId) : null;
      if (!session || !offenderId || ![session.userAId, session.userBId].includes(offenderId) || offenderId === userId) {
        return socket.emit("error", { code: "INVALID_INPUT", message: "Invalid report" });
      }
      // For v1: log to console; extend with Report model later
      console.log("Report:", { sessionId, reporterId: userId, offenderId, reason: reason?.slice(0, 500) });
    });

    // Direct messages (DM)
    socket.on("dm:send", async (payload: unknown) => {
      const { to, content } = objectPayload(payload);
      if (!to || to === userId || !content?.trim() || content.length > 4000) {
        return socket.emit("error", { code: "INVALID_INPUT", message: "Invalid direct message" });
      }
      const receiver = await prisma.user.findUnique({ where: { id: to }, select: { id: true } });
      if (!receiver) return socket.emit("error", { code: "NOT_FOUND", message: "User not found" });
      const message = await prisma.message.create({ data: { content: content.trim(), senderId: userId, receiverId: to } });
      // emit to both parties
      io.to(`user:${to}`).emit("dm:receive", message);
      io.to(`user:${userId}`).emit("dm:receive", message);
    });

    socket.on("disconnect", () => {
      // Remove from queue on disconnect
      const mode = userMatchMode.get(userId);
      if (mode) {
        matchService.leave(userId, mode).catch(() => {});
        userMatchMode.delete(userId);
      }
    });
  });
}

function objectPayload(value: unknown): Record<string, string | undefined> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(input).map(([key, item]) => [key, typeof item === "string" ? item : undefined])
  );
}

function activeMemberSession(prisma: PrismaClient, sessionId: string, userId: string) {
  return prisma.matchSession.findFirst({
    where: {
      id: sessionId,
      status: "active",
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    select: { id: true, userAId: true, userBId: true },
  });
}
