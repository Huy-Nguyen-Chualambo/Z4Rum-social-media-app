import { Router } from "express";
import { authMiddleware } from "../../utils/jwt";
import { MatchService } from "../../services/matchService";
import { prisma } from "../../utils/prisma";

const router = Router();
const matchService = new MatchService(prisma);

router.use(authMiddleware);

router.post("/start", async (req, res) => {
  const userId = (req as any).userId as string;
  const session = await matchService.join(userId);
  res.json({ session });
});

router.post("/stop", async (req, res) => {
  const userId = (req as any).userId as string;
  await matchService.leave(userId);
  res.json({ ok: true });
});

export default router;
