import { Router } from "express";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../utils/prisma";
import { signToken, authMiddleware } from "../../utils/jwt";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const toAuthUser = (user: { id: string; username: string; email: string; gender: "male" | "female"; avatarUrl?: string | null; bio?: string | null }) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  gender: user.gender,
});

async function makeUniqueUsername(email: string, name?: string | null) {
  const base = (name || email.split("@")[0] || "google_user")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "google_user";

  let username = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}_${suffix++}`.slice(0, 32);
  }
  return username;
}

router.post("/register", async (req, res) => {
  const { username, email, password, gender } = req.body as { username: string; email: string; password: string; gender: "male" | "female" };
  if (!username || !email || !password || !gender) return res.status(400).json({ error: "Missing fields" });
  if (gender !== "male" && gender !== "female") return res.status(400).json({ error: "Invalid gender" });
  
  // Check if email already exists
  const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingUserByEmail) return res.status(400).json({ error: "Email đã tồn tại" });
  
  // Check if username already exists
  const existingUserByUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUserByUsername) return res.status(400).json({ error: "Tên người dùng đã tồn tại" });
  
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { username, email, password: hash, gender } });
    const token = signToken({ id: user.id });
    res.json({ token, user: toAuthUser(user) });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "Người dùng không tồn tại" });
  if (!user.password) return res.status(401).json({ error: "Tài khoản này đăng nhập bằng Google" });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Mật khẩu không chính xác" });
  const token = signToken({ id: user.id });
  res.json({ token, user: toAuthUser(user) });
});

router.post("/google", async (req, res) => {
  const { credential, gender } = req.body as { credential?: string; gender?: "male" | "female" };
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: "Google login chưa được cấu hình" });
  if (!credential) return res.status(400).json({ error: "Missing Google credential" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload?.sub;
    const email = payload?.email;
    const emailVerified = payload?.email_verified;

    if (!googleId || !email || !emailVerified) return res.status(401).json({ error: "Google credential không hợp lệ" });

    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            googleId,
            avatarUrl: existingUser.avatarUrl || payload.picture,
          },
        });
      } else {
        const username = await makeUniqueUsername(email, payload.name);
        user = await prisma.user.create({
          data: {
            username,
            email,
            googleId,
            avatarUrl: payload.picture,
            gender: gender === "female" ? "female" : "male",
          },
        });
      }
    }

    const token = signToken({ id: user.id });
    res.json({ token, user: toAuthUser(user) });
  } catch {
    res.status(401).json({ error: "Không thể đăng nhập bằng Google" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "Người dùng không tồn tại" });
  res.json(toAuthUser(user));
});
router.get("/", (_req, res) => {
  res.json({
    ok: true,
    routes: [
      "POST /auth/register",
      "POST /auth/login",
      "POST /auth/google",
      "GET /auth/me (Authorization: Bearer <token>)",
    ],
  });
});
export default router;
