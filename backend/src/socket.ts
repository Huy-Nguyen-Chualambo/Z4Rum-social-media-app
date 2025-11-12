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

    socket.on("auth:handshake", ({ token }) => {
      try {
        const decoded = verifyToken(token);
        (socket as any).userId = decoded.id;
        socket.join(`user:${decoded.id}`);
      } catch {
        socket.emit("error", { code: "UNAUTHORIZED", message: "Invalid token" });
      }
    });

    socket.on("match:join", async ({ mode = "normal" }: { mode?: "normal" | "opposite" }) => {
      try {
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
      const mode = userMatchMode.get(userId) || "normal";
      await matchService.leave(userId, mode);
      userMatchMode.delete(userId);
    });

    socket.on("message:send", async ({ sessionId, from, content }) => {
      const message = await prisma.message.create({
        data: { content, senderId: from, sessionId },
      });
      io.to(`session:${sessionId}`).emit("message:receive", {
        id: message.id,
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
