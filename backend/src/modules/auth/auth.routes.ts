import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../utils/prisma";
import { signToken, authMiddleware } from "../../utils/jwt";

const router = Router();

router.post("/register", async (req, res) => {
  const { username, email, password, gender } = req.body as { username: string; email: string; password: string; gender: "male" | "female" };
  if (!username || !email || !password || !gender) return res.status(400).json({ error: "Missing fields" });
  if (gender !== "male" && gender !== "female") return res.status(400).json({ error: "Invalid gender" });
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { username, email, password: hash, gender } });
    const token = signToken({ id: user.id });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, gender: user.gender } });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "User not found" });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken({ id: user.id });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, gender: user.gender } });
});

router.get("/me", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, bio: user.bio, gender: user.gender });
});

export default router;
