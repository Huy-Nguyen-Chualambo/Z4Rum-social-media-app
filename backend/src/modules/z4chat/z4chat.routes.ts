import { Router } from "express";
import { prisma } from "../../utils/prisma";
import { authMiddleware } from "../../utils/jwt";

const router = Router();

router.use(authMiddleware);

/** Trim a value to a string, capped at `max` chars. Returns "" for anything non-string. */
const str = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Same as `str` but collapses empty strings to null, for optional columns. */
const nullableStr = (value: unknown, max: number): string | null => str(value, max) || null;

const tags = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((tag) => str(tag, 32))
        .filter(Boolean)
        .slice(0, 8)
    : [];

const CHARACTER_SELECT = {
  id: true,
  ownerId: true,
  name: true,
  avatarUrl: true,
  tagline: true,
  description: true,
  personality: true,
  speechStyle: true,
  greeting: true,
  exampleDialog: true,
  likes: true,
  dislikes: true,
  tags: true,
  isPublic: true,
  proactive: true,
  clinginess: true,
  createdAt: true,
  updatedAt: true,
} as const;

const STORY_SELECT = {
  id: true,
  ownerId: true,
  title: true,
  synopsis: true,
  worldSetting: true,
  plotOutline: true,
  userRoleName: true,
  userRoleDesc: true,
  openingScene: true,
  tags: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Readable = owned by the caller, or explicitly published by someone else. */
const readableWhere = (userId: string) => ({
  OR: [{ ownerId: userId }, { isPublic: true }],
});

/**
 * Load a session the caller owns. Returns null when it does not exist OR belongs
 * to somebody else - callers turn both into a 404 so session ids stay unguessable.
 */
async function ownedSession(sessionId: string, userId: string) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });
  return session;
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

router.get("/characters", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const scope = (req.query.scope as string) || "all";
    const where =
      scope === "mine"
        ? { ownerId: userId }
        : scope === "public"
        ? { isPublic: true, ownerId: { not: userId } }
        : readableWhere(userId);

    const characters = await prisma.character.findMany({
      where,
      select: { ...CHARACTER_SELECT, owner: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    res.json(characters);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/characters", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const name = str(req.body?.name, 60);
    const description = str(req.body?.description, 4000);
    const greeting = str(req.body?.greeting, 2000);

    if (!name) return res.status(400).json({ error: "Tên nhân vật là bắt buộc" });
    if (!description) return res.status(400).json({ error: "Mô tả nhân vật là bắt buộc" });
    if (!greeting) return res.status(400).json({ error: "Câu chào mở đầu là bắt buộc" });

    const character = await prisma.character.create({
      data: {
        ownerId: userId,
        name,
        description,
        greeting,
        avatarUrl: nullableStr(req.body?.avatarUrl, 500),
        tagline: nullableStr(req.body?.tagline, 160),
        personality: nullableStr(req.body?.personality, 2000),
        speechStyle: nullableStr(req.body?.speechStyle, 2000),
        exampleDialog: nullableStr(req.body?.exampleDialog, 4000),
        likes: nullableStr(req.body?.likes, 500),
        dislikes: nullableStr(req.body?.dislikes, 500),
        tags: tags(req.body?.tags),
        isPublic: Boolean(req.body?.isPublic),
        proactive: req.body?.proactive === undefined ? true : Boolean(req.body.proactive),
        clinginess: Math.min(3, Math.max(1, Number(req.body?.clinginess) || 2)),
      },
      select: CHARACTER_SELECT,
    });
    res.json(character);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/characters/:id", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const character = await prisma.character.findFirst({
      where: { id: req.params.id, ...readableWhere(userId) },
      select: { ...CHARACTER_SELECT, owner: { select: { id: true, username: true, avatarUrl: true } } },
    });
    if (!character) return res.status(404).json({ error: "Không tìm thấy nhân vật" });
    res.json(character);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/characters/:id", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const existing = await prisma.character.findFirst({ where: { id: req.params.id, ownerId: userId } });
    if (!existing) return res.status(404).json({ error: "Không tìm thấy nhân vật" });

    const data: Record<string, unknown> = {};
    if (req.body?.name !== undefined) {
      const name = str(req.body.name, 60);
      if (!name) return res.status(400).json({ error: "Tên nhân vật không được để trống" });
      data.name = name;
    }
    if (req.body?.description !== undefined) {
      const description = str(req.body.description, 4000);
      if (!description) return res.status(400).json({ error: "Mô tả nhân vật không được để trống" });
      data.description = description;
    }
    if (req.body?.greeting !== undefined) {
      const greeting = str(req.body.greeting, 2000);
      if (!greeting) return res.status(400).json({ error: "Câu chào mở đầu không được để trống" });
      data.greeting = greeting;
    }
    if (req.body?.avatarUrl !== undefined) data.avatarUrl = nullableStr(req.body.avatarUrl, 500);
    if (req.body?.tagline !== undefined) data.tagline = nullableStr(req.body.tagline, 160);
    if (req.body?.personality !== undefined) data.personality = nullableStr(req.body.personality, 2000);
    if (req.body?.speechStyle !== undefined) data.speechStyle = nullableStr(req.body.speechStyle, 2000);
    if (req.body?.exampleDialog !== undefined) data.exampleDialog = nullableStr(req.body.exampleDialog, 4000);
    if (req.body?.likes !== undefined) data.likes = nullableStr(req.body.likes, 500);
    if (req.body?.dislikes !== undefined) data.dislikes = nullableStr(req.body.dislikes, 500);
    if (req.body?.tags !== undefined) data.tags = tags(req.body.tags);
    if (req.body?.isPublic !== undefined) data.isPublic = Boolean(req.body.isPublic);
    if (req.body?.proactive !== undefined) data.proactive = Boolean(req.body.proactive);
    if (req.body?.clinginess !== undefined) {
      data.clinginess = Math.min(3, Math.max(1, Number(req.body.clinginess) || 2));
    }

    const character = await prisma.character.update({
      where: { id: req.params.id },
      data,
      select: CHARACTER_SELECT,
    });
    res.json(character);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/characters/:id", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const existing = await prisma.character.findFirst({ where: { id: req.params.id, ownerId: userId } });
    if (!existing) return res.status(404).json({ error: "Không tìm thấy nhân vật" });
    await prisma.character.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

router.get("/stories", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const scope = (req.query.scope as string) || "all";
    const where =
      scope === "mine"
        ? { ownerId: userId }
        : scope === "public"
        ? { isPublic: true, ownerId: { not: userId } }
        : readableWhere(userId);

    const stories = await prisma.story.findMany({
      where,
      select: { ...STORY_SELECT, owner: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    res.json(stories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/stories", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const title = str(req.body?.title, 120);
    if (!title) return res.status(400).json({ error: "Tên cốt truyện là bắt buộc" });

    const story = await prisma.story.create({
      data: {
        ownerId: userId,
        title,
        synopsis: nullableStr(req.body?.synopsis, 2000),
        worldSetting: nullableStr(req.body?.worldSetting, 4000),
        plotOutline: nullableStr(req.body?.plotOutline, 4000),
        userRoleName: nullableStr(req.body?.userRoleName, 60),
        userRoleDesc: nullableStr(req.body?.userRoleDesc, 2000),
        openingScene: nullableStr(req.body?.openingScene, 2000),
        tags: tags(req.body?.tags),
        isPublic: Boolean(req.body?.isPublic),
      },
      select: STORY_SELECT,
    });
    res.json(story);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/stories/:id", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const story = await prisma.story.findFirst({
      where: { id: req.params.id, ...readableWhere(userId) },
      select: { ...STORY_SELECT, owner: { select: { id: true, username: true, avatarUrl: true } } },
    });
    if (!story) return res.status(404).json({ error: "Không tìm thấy cốt truyện" });
    res.json(story);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/stories/:id", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const existing = await prisma.story.findFirst({ where: { id: req.params.id, ownerId: userId } });
    if (!existing) return res.status(404).json({ error: "Không tìm thấy cốt truyện" });

    const data: Record<string, unknown> = {};
    if (req.body?.title !== undefined) {
      const title = str(req.body.title, 120);
      if (!title) return res.status(400).json({ error: "Tên cốt truyện không được để trống" });
      data.title = title;
    }
    if (req.body?.synopsis !== undefined) data.synopsis = nullableStr(req.body.synopsis, 2000);
    if (req.body?.worldSetting !== undefined) data.worldSetting = nullableStr(req.body.worldSetting, 4000);
    if (req.body?.plotOutline !== undefined) data.plotOutline = nullableStr(req.body.plotOutline, 4000);
    if (req.body?.userRoleName !== undefined) data.userRoleName = nullableStr(req.body.userRoleName, 60);
    if (req.body?.userRoleDesc !== undefined) data.userRoleDesc = nullableStr(req.body.userRoleDesc, 2000);
    if (req.body?.openingScene !== undefined) data.openingScene = nullableStr(req.body.openingScene, 2000);
    if (req.body?.tags !== undefined) data.tags = tags(req.body.tags);
    if (req.body?.isPublic !== undefined) data.isPublic = Boolean(req.body.isPublic);

    const story = await prisma.story.update({
      where: { id: req.params.id },
      data,
      select: STORY_SELECT,
    });
    res.json(story);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/stories/:id", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const existing = await prisma.story.findFirst({ where: { id: req.params.id, ownerId: userId } });
    if (!existing) return res.status(404).json({ error: "Không tìm thấy cốt truyện" });
    await prisma.story.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Unread badge + proactive queue
// Registered before /sessions/:id so the literal segments win the match.
// ---------------------------------------------------------------------------

router.get("/unread", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const rows = await prisma.chatSession.findMany({
      where: { userId, unreadCount: { gt: 0 } },
      select: { unreadCount: true },
    });
    res.json({ total: rows.reduce((sum, row) => sum + row.unreadCount, 0), sessions: rows.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Coarse filter for sessions that may deserve a proactive nudge: the character
 * opted in, the user has been quiet for a while, and we have not nudged
 * recently. The precise time-slot rule lives client-side in lib/z4chat/proactive.ts
 * so it can use the viewer's clock; this endpoint only avoids shipping the
 * whole session list on every page load.
 */
router.get("/proactive/due", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const quietSince = new Date(Date.now() - 45 * 60 * 1000);
    const nudgedSince = new Date(Date.now() - 3 * 60 * 60 * 1000);

    const sessions = await prisma.chatSession.findMany({
      where: {
        userId,
        lastSeenAt: { lt: quietSince },
        character: { proactive: true },
        OR: [{ lastProactiveAt: null }, { lastProactiveAt: { lt: nudgedSince } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: {
        character: { select: CHARACTER_SELECT },
        story: { select: STORY_SELECT },
        memories: { where: { pinned: true }, orderBy: { createdAt: "asc" }, take: 40 },
        messages: { orderBy: { createdAt: "desc" }, take: 6 },
      },
    });

    // messages come back newest-first from the take above; hand them over in reading order.
    res.json(sessions.map((session) => ({ ...session, messages: [...session.messages].reverse() })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

router.get("/sessions", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        character: { select: { id: true, name: true, avatarUrl: true, tagline: true } },
        story: { select: { id: true, title: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
    });

    res.json(
      sessions.map(({ messages, ...session }) => ({
        ...session,
        lastMessage: messages[0] || null,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const characterId = str(req.body?.characterId, 64);
    const storyId = str(req.body?.storyId, 64);

    if (!characterId) return res.status(400).json({ error: "characterId là bắt buộc" });

    const character = await prisma.character.findFirst({
      where: { id: characterId, ...readableWhere(userId) },
    });
    if (!character) return res.status(404).json({ error: "Không tìm thấy nhân vật" });

    const story = storyId
      ? await prisma.story.findFirst({ where: { id: storyId, ...readableWhere(userId) } })
      : null;
    if (storyId && !story) return res.status(404).json({ error: "Không tìm thấy cốt truyện" });

    // The scene is set first, then the character speaks - same order a reader
    // would meet them on the page.
    const opening: Array<{ role: string; content: string; kind: string }> = [];
    if (story?.openingScene) {
      opening.push({ role: "assistant", content: story.openingScene, kind: "opening" });
    }
    opening.push({ role: "assistant", content: character.greeting, kind: "opening" });

    const session = await prisma.chatSession.create({
      data: {
        userId,
        characterId: character.id,
        storyId: story?.id ?? null,
        title: story ? `${character.name} · ${story.title}` : character.name,
        provider: str(req.body?.provider, 32) || undefined,
        model: str(req.body?.model, 120) || undefined,
        messages: { create: opening },
      },
      include: {
        character: { select: CHARACTER_SELECT },
        story: { select: STORY_SELECT },
        messages: { orderBy: { createdAt: "asc" } },
        memories: { orderBy: { createdAt: "asc" } },
      },
    });

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/sessions/:id", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));

    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, userId },
      include: {
        character: { select: CHARACTER_SELECT },
        story: { select: STORY_SELECT },
        memories: { orderBy: { createdAt: "asc" } },
        _count: { select: { messages: true } },
      },
    });
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    // Newest `limit` messages, handed back oldest-first for rendering.
    const recent = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json({ ...session, messages: [...recent].reverse() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/sessions/:id", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });
    await prisma.chatSession.delete({ where: { id: session.id } });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

router.post("/sessions/:id/messages", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    const role = str(req.body?.role, 16);
    const content = str(req.body?.content, 20000);
    const kind = str(req.body?.kind, 16) || "normal";

    if (role !== "user" && role !== "assistant") {
      return res.status(400).json({ error: "role phải là user hoặc assistant" });
    }
    if (!content) return res.status(400).json({ error: "Nội dung tin nhắn không được để trống" });

    const message = await prisma.chatMessage.create({
      data: { sessionId: session.id, role, content, kind },
    });

    // Touch the session so the hub sorts by real activity.
    await prisma.chatSession.update({
      where: { id: session.id },
      data: role === "user" ? { lastSeenAt: new Date() } : { updatedAt: new Date() },
    });

    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/sessions/:id/messages/:mid", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    const content = str(req.body?.content, 20000);
    if (!content) return res.status(400).json({ error: "Nội dung tin nhắn không được để trống" });

    const existing = await prisma.chatMessage.findFirst({
      where: { id: req.params.mid, sessionId: session.id },
    });
    if (!existing) return res.status(404).json({ error: "Không tìm thấy tin nhắn" });

    const message = await prisma.chatMessage.update({
      where: { id: existing.id },
      data: { content },
    });
    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/sessions/:id/messages/:mid", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    const existing = await prisma.chatMessage.findFirst({
      where: { id: req.params.mid, sessionId: session.id },
    });
    if (!existing) return res.status(404).json({ error: "Không tìm thấy tin nhắn" });

    await prisma.chatMessage.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Session state: seen, summary, model
// ---------------------------------------------------------------------------

router.post("/sessions/:id/seen", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    const updated = await prisma.chatSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(), unreadCount: 0 },
      select: { id: true, lastSeenAt: true, unreadCount: true },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Persist a freshly compacted memory: the rolling summary, how far it covers,
 * and any facts the summarizer thought worth pinning.
 */
router.put("/sessions/:id/summary", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    const summary = str(req.body?.summary, 8000);
    if (!summary) return res.status(400).json({ error: "summary không được để trống" });

    const summarizedUpTo = Math.max(session.summarizedUpTo, Number(req.body?.summarizedUpTo) || 0);
    const facts = Array.isArray(req.body?.facts)
      ? req.body.facts.map((fact: unknown) => str(fact, 300)).filter(Boolean).slice(0, 10)
      : [];

    // Skip facts we already hold verbatim so the memory book does not fill up
    // with near-duplicates every time we compact.
    const known = await prisma.memoryEntry.findMany({
      where: { sessionId: session.id },
      select: { content: true },
    });
    const knownSet = new Set(known.map((entry) => entry.content.toLowerCase()));
    const fresh = facts.filter((fact: string) => !knownSet.has(fact.toLowerCase()));

    const updated = await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        summary,
        summarizedUpTo,
        ...(fresh.length
          ? { memories: { create: fresh.map((content: string) => ({ content, source: "auto" })) } }
          : {}),
      },
      include: { memories: { orderBy: { createdAt: "asc" } } },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/sessions/:id/model", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    const provider = str(req.body?.provider, 32);
    const model = str(req.body?.model, 120);
    if (!provider || !model) return res.status(400).json({ error: "provider và model là bắt buộc" });

    const updated = await prisma.chatSession.update({
      where: { id: session.id },
      data: { provider, model },
      select: { id: true, provider: true, model: true },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Memory book
// ---------------------------------------------------------------------------

router.get("/sessions/:id/memories", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    const memories = await prisma.memoryEntry.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
    });
    res.json(memories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/sessions/:id/memories", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    const content = str(req.body?.content, 300);
    if (!content) return res.status(400).json({ error: "Nội dung ký ức không được để trống" });

    const memory = await prisma.memoryEntry.create({
      data: {
        sessionId: session.id,
        content,
        source: str(req.body?.source, 16) === "auto" ? "auto" : "user",
        pinned: req.body?.pinned === undefined ? true : Boolean(req.body.pinned),
      },
    });
    res.json(memory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/sessions/:id/memories/:mid", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    const existing = await prisma.memoryEntry.findFirst({
      where: { id: req.params.mid, sessionId: session.id },
    });
    if (!existing) return res.status(404).json({ error: "Không tìm thấy ký ức" });

    const data: Record<string, unknown> = {};
    if (req.body?.content !== undefined) {
      const content = str(req.body.content, 300);
      if (!content) return res.status(400).json({ error: "Nội dung ký ức không được để trống" });
      data.content = content;
    }
    if (req.body?.pinned !== undefined) data.pinned = Boolean(req.body.pinned);

    const memory = await prisma.memoryEntry.update({ where: { id: existing.id }, data });
    res.json(memory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/sessions/:id/memories/:mid", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    const existing = await prisma.memoryEntry.findFirst({
      where: { id: req.params.mid, sessionId: session.id },
    });
    if (!existing) return res.status(404).json({ error: "Không tìm thấy ký ức" });

    await prisma.memoryEntry.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Proactive delivery
// ---------------------------------------------------------------------------

/** Store a character-initiated message and mark the session as having news. */
router.post("/sessions/:id/proactive", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });

    const content = str(req.body?.content, 4000);
    if (!content) return res.status(400).json({ error: "Nội dung tin nhắn không được để trống" });

    const message = await prisma.chatMessage.create({
      data: { sessionId: session.id, role: "assistant", content, kind: "proactive" },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: { lastProactiveAt: new Date(), unreadCount: { increment: 1 } },
    });

    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
