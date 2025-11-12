import { Router } from "express";
import { prisma } from "../../utils/prisma";
import { authMiddleware } from "../../utils/jwt";
import { emitLikeUpdated } from "../../realtime";

const router = Router();

router.use(authMiddleware);

router.post("/", async (req, res) => {
  const userId = (req as any).userId as string;
  const { content, imageUrl } = req.body as { content: string; imageUrl?: string };
  const post = await prisma.post.create({ data: { content, imageUrl, authorId: userId } });
  res.json(post);
});

router.get("/", async (req, res) => {
  const limit = Number(req.query.limit || 10);
  const cursor = (req.query.cursor as string) || undefined;
  const authorId = (req.query.authorId as string) || undefined;
  const searchRaw = typeof req.query.search === "string" ? req.query.search : "";
  const search = searchRaw.trim();

  const conditions: any[] = [];
  if (authorId) conditions.push({ authorId });
  if (search) {
    conditions.push({
      OR: [
        { content: { contains: search, mode: "insensitive" } },
        { author: { username: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  const where = conditions.length ? { AND: conditions } : undefined;

  const posts = await prisma.post.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    ...(where ? { where } : {}),
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, username: true, avatarUrl: true } }, _count: { select: { likes: true, comments: true } } },
  });
  const nextCursor = posts.length > limit ? posts.pop()!.id : null;
  res.json({ items: posts, nextCursor });
});

router.get("/:id", async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: "Not found" });
  res.json(post);
});

router.put("/:id", async (req, res) => {
  const userId = (req as any).userId as string;
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: "Not found" });
  if (post.authorId !== userId) return res.status(403).json({ error: "Forbidden" });
  const { content, imageUrl } = req.body as { content?: string; imageUrl?: string };
  const updateData: { content?: string; imageUrl?: string } = {};
  if (content !== undefined) updateData.content = content;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
  const updated = await prisma.post.update({ where: { id: req.params.id }, data: updateData });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).userId as string;
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: "Not found" });
  if (post.authorId !== userId) return res.status(403).json({ error: "Forbidden" });
  // Remove children first to avoid FK errors
  await prisma.like.deleteMany({ where: { postId: post.id } });
  await prisma.comment.deleteMany({ where: { postId: post.id } });
  await prisma.post.delete({ where: { id: post.id } });
  res.json({ ok: true });
});

router.post("/:id/like", async (req, res) => {
  const userId = (req as any).userId as string;
  const postId = req.params.id;
  // Toggle like: if exists -> unlike; else -> like
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { userId, postId } });
  }
  const count = await prisma.like.count({ where: { postId } });
  emitLikeUpdated({ postId, likes: count });
  res.json({ ok: true, likes: count, liked: !existing });
});

router.get("/:id/comments", async (req, res) => {
  const limit = Number(req.query.limit || 20);
  const cursor = (req.query.cursor as string) || undefined;
  const items = await prisma.comment.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    where: { postId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, username: true, avatarUrl: true } } },
  });
  const nextCursor = items.length > limit ? items.pop()!.id : null;
  res.json({ items, nextCursor });
});

router.post("/:id/comments", async (req, res) => {
  const userId = (req as any).userId as string;
  const { content } = req.body as { content: string };
  if (!content?.trim()) return res.status(400).json({ error: "Content required" });
  const item = await prisma.comment.create({
    data: { content: content.trim(), authorId: userId, postId: req.params.id },
    include: { author: { select: { id: true, username: true, avatarUrl: true } } },
  });
  const comments = await prisma.comment.count({ where: { postId: req.params.id } });
  res.json({ item, comments });
});

export default router;
