import { Router } from "express";
import { prisma } from "../../utils/prisma";
import { authMiddleware } from "../../utils/jwt";
import { nonEmptyString } from "../../utils/validation";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const me = (req as any).userId as string;
  // Fetch recent messages involving me, then pick latest per peer
  const msgs = await prisma.message.findMany({
    where: { OR: [{ senderId: me }, { receiverId: me }] },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const seen = new Set<string>();
  const conversations: { peerId: string; lastMessage: typeof msgs[number] }[] = [];
  for (const m of msgs) {
    const other = m.senderId === me ? m.receiverId! : m.senderId!;
    if (!other) continue;
    if (seen.has(other)) continue;
    seen.add(other);
    conversations.push({ peerId: other, lastMessage: m });
  }
  const peers = await prisma.user.findMany({
    where: { id: { in: conversations.map((c) => c.peerId) } },
    select: { id: true, username: true, avatarUrl: true },
  });
  const peerMap = new Map(peers.map((p) => [p.id, p] as const));
  res.json(
    conversations.map((c) => ({
      peer: peerMap.get(c.peerId),
      lastMessage: c.lastMessage,
    }))
  );
});

router.get("/:userId", async (req, res) => {
  const me = (req as any).userId as string;
  const other = req.params.userId;
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: me, receiverId: other },
        { senderId: other, receiverId: me },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(messages);
});

router.post("/:userId", async (req, res) => {
  const senderId = (req as any).userId as string;
  const receiverId = req.params.userId;
  const content = nonEmptyString(req.body?.content, 4000);
  if (!content) return res.status(400).json({ error: "Nội dung phải có từ 1 đến 4000 ký tự", code: "INVALID_INPUT" });
  const message = await prisma.message.create({
    data: { content, senderId, receiverId },
  });
  res.json(message);
});

export default router;
