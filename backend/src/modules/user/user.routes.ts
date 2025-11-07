import { Router } from "express";
import { prisma } from "../../utils/prisma";
import { authMiddleware } from "../../utils/jwt";

const router = Router();

router.use(authMiddleware);

router.get("/:id", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ id: user.id, username: user.username, avatarUrl: user.avatarUrl, bio: user.bio, gender: user.gender });
});

router.put("/:id", async (req, res) => {
  const userId = (req as any).userId as string;
  if (userId !== req.params.id) return res.status(403).json({ error: "Forbidden" });
  const { avatarUrl, bio, username, gender } = req.body as { avatarUrl?: string; bio?: string; username?: string; gender?: "male" | "female" };
  if (gender && gender !== "male" && gender !== "female") return res.status(400).json({ error: "Invalid gender" });
  const user = await prisma.user.update({ where: { id: userId }, data: { avatarUrl, bio, username, gender } });
  res.json({ id: user.id, username: user.username, avatarUrl: user.avatarUrl, bio: user.bio, gender: user.gender });
});

router.get("/", async (req, res) => {
  const search = (req.query.search as string) || "";
  const users = await prisma.user.findMany({
    where: { username: { contains: search, mode: "insensitive" } },
    take: 20,
  });
  res.json(users.map((u) => ({ id: u.id, username: u.username, avatarUrl: u.avatarUrl })));
});

export default router;
