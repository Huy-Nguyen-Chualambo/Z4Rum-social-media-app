import { Router } from "express";
import { prisma } from "../../utils/prisma";
import { authMiddleware } from "../../utils/jwt";

const router = Router();

router.use(authMiddleware);

router.post("/request/:receiverId", async (req, res) => {
  const senderId = (req as any).userId as string;
  const receiverId = req.params.receiverId;
  if (senderId === receiverId) return res.status(400).json({ error: "Cannot friend yourself" });
  const existing = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId, receiverId, status: "pending" },
        { senderId: receiverId, receiverId: senderId, status: "pending" },
      ],
    },
  });
  if (existing) return res.status(400).json({ error: "Already pending" });
  const reqRow = await prisma.friendRequest.create({ data: { senderId, receiverId } });
  res.json(reqRow);
});

router.post("/accept/:requestId", async (req, res) => {
  const userId = (req as any).userId as string;
  const fr = await prisma.friendRequest.findUnique({ where: { id: req.params.requestId } });
  if (!fr || fr.receiverId !== userId) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.friendRequest.update({ where: { id: fr.id }, data: { status: "accepted" } });
  res.json(updated);
});

router.get("/", async (req, res) => {
  const userId = (req as any).userId as string;
  const requests = await prisma.friendRequest.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: "desc" },
  });
  res.json(requests);
});

export default router;
