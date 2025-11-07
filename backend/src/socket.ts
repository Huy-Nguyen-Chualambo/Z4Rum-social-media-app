import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "./utils/jwt";
import { MatchService } from "./services/matchService";

export function initSocket(io: Server, prisma: PrismaClient) {
  const matchService = new MatchService(prisma);

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

    socket.on("auth:handshake", ({ token }) => {
      try {
        const decoded = verifyToken(token);
        (socket as any).userId = decoded.id;
        socket.join(`user:${decoded.id}`);
      } catch {
        socket.emit("error", { code: "UNAUTHORIZED", message: "Invalid token" });
      }
    });

    socket.on("match:join", async () => {
      const session = await matchService.join(userId);
      if (session) {
        const room = `session:${session.id}`;
        socket.join(room);
        const peers = io.sockets.sockets;
        for (const [, s] of peers) {
          if ((s as any).userId === session.userAId || (s as any).userId === session.userBId) {
            s.join(room);
            s.emit("match:found", {
              sessionId: session.id,
              peer: { id: (s as any).userId === session.userAId ? session.userBId : session.userAId },
            });
          }
        }
      } else {
        socket.emit("match:queueStatus", { position: 1 });
      }
    });

    socket.on("match:leave", async () => {
      await matchService.leave(userId);
    });

    socket.on("message:send", async ({ sessionId, from, content }) => {
      const message = await prisma.message.create({
        data: { content, senderId: from, sessionId },
      });
      io.to(`session:${sessionId}`).emit("message:receive", {
        sessionId,
        from: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
      });
    });

    socket.on("session:end", async ({ sessionId, by, reason }) => {
      await matchService.end(sessionId);
      io.to(`session:${sessionId}`).emit("session:ended", { sessionId, by, reason });
    });

    socket.on("session:report", async ({ sessionId, offenderId, reason }) => {
      // For v1: log to console; extend with Report model later
      console.log("Report:", { sessionId, offenderId, reason });
    });

    // Direct messages (DM)
    socket.on("dm:send", async ({ to, content }: { to: string; content: string }) => {
      if (!content?.trim()) return;
      const message = await prisma.message.create({ data: { content: content.trim(), senderId: userId, receiverId: to } });
      // emit to both parties
      io.to(`user:${to}`).emit("dm:receive", message);
      io.to(`user:${userId}`).emit("dm:receive", message);
    });

    socket.on("disconnect", () => {});
  });
}
