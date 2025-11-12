import { Router } from "express";
import { prisma } from "../../utils/prisma";
import { authMiddleware } from "../../utils/jwt";

const router = Router();

router.use(authMiddleware);

// Get all active topics (not ended)
router.get("/topics", async (req, res) => {
  try {
    const now = new Date();
    const topics = await prisma.voteTopic.findMany({
      where: {
        endsAt: { gt: now },
      },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
        _count: {
          select: { votes: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json(topics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get trending topics (most votes, not ended)
router.get("/topics/trending", async (req, res) => {
  try {
    const now = new Date();
    const limit = Number(req.query.limit || 5);
    const topics = await prisma.voteTopic.findMany({
      where: {
        endsAt: { gt: now },
      },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
        _count: {
          select: { votes: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit * 2, // Get more to sort by vote count
    });
    
    // Sort by total vote count and take top N
    const sorted = topics
      .map((topic) => {
        const totalVotes = topic.options.reduce((sum, opt) => sum + (opt._count?.votes || 0), 0);
        return { ...topic, totalVotes };
      })
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, limit);
    
    res.json(sorted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single topic with user's vote
router.get("/topics/:id", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const topicId = req.params.id;
    const topic = await prisma.voteTopic.findUnique({
      where: { id: topicId },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
        votes: {
          where: { userId },
          select: { optionId: true },
        },
        _count: {
          select: { votes: true },
        },
      },
    });
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }
    res.json(topic);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new topic
router.post("/topics", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { title, description, options, durationHours } = req.body;

    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: "Title and at least 2 options are required" });
    }

    const duration = Number(durationHours) || 24; // Default 24 hours
    const endsAt = new Date(Date.now() + duration * 60 * 60 * 1000);

    const topic = await prisma.voteTopic.create({
      data: {
        title,
        description: description || null,
        authorId: userId,
        endsAt,
        options: {
          create: options.map((text: string) => ({ text })),
        },
      },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
        _count: {
          select: { votes: true },
        },
      },
    });

    res.json(topic);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vote on a topic
router.post("/topics/:id/vote", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const topicId = req.params.id;
    const { optionId } = req.body;

    if (!optionId) {
      return res.status(400).json({ error: "optionId is required" });
    }

    // Check if topic exists and is still active
    const topic = await prisma.voteTopic.findUnique({
      where: { id: topicId },
      include: {
        options: true,
      },
    });

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    if (new Date() > topic.endsAt) {
      return res.status(400).json({ error: "Voting has ended" });
    }

    // Check if option belongs to topic
    const option = topic.options.find((o) => o.id === optionId);
    if (!option) {
      return res.status(400).json({ error: "Invalid option" });
    }

    // Check if user already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_topicId: { userId, topicId },
      },
    });

    if (existingVote) {
      // Update existing vote
      await prisma.vote.update({
        where: { id: existingVote.id },
        data: { optionId },
      });
    } else {
      // Create new vote
      await prisma.vote.create({
        data: {
          userId,
          topicId,
          optionId,
        },
      });
    }

    // Return updated topic with vote counts
    const updatedTopic = await prisma.voteTopic.findUnique({
      where: { id: topicId },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
        votes: {
          where: { userId },
          select: { optionId: true },
        },
        _count: {
          select: { votes: true },
        },
      },
    });

    res.json(updatedTopic);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments for a topic
router.get("/topics/:id/comments", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 20);
    const cursor = (req.query.cursor as string) || undefined;
    const items = await prisma.voteComment.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: { topicId: req.params.id },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });
    const nextCursor = items.length > limit ? items[limit].id : null;
    res.json({ items: items.slice(0, limit), nextCursor });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create comment for a topic
router.post("/topics/:id/comments", async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const topicId = req.params.id;
    const { content, imageUrl } = req.body;

    if (!content?.trim() && !imageUrl?.trim()) {
      return res.status(400).json({ error: "Content or imageUrl is required" });
    }

    // Check if topic exists
    const topic = await prisma.voteTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const comment = await prisma.voteComment.create({
      data: {
        content: content?.trim() || "",
        imageUrl: imageUrl?.trim() || null,
        authorId: userId,
        topicId,
      },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    const commentCount = await prisma.voteComment.count({ where: { topicId } });
    res.json({ item: comment, commentCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

