import Redis from "ioredis";
import { PrismaClient, Gender } from "@prisma/client";

type QueueItem = { userId: string; gender: Gender };

type QueueDriver = {
  enqueue(item: QueueItem, mode: "normal" | "opposite"): Promise<void>;
  dequeuePair(mode: "normal" | "opposite"): Promise<[QueueItem, QueueItem] | null>;
  remove(userId: string, mode: "normal" | "opposite"): Promise<void>;
};

class InMemoryQueue implements QueueDriver {
  private normalQueue: QueueItem[] = [];
  private oppositeQueue: QueueItem[] = [];
  
  async enqueue(item: QueueItem, mode: "normal" | "opposite") {
    const queue = mode === "normal" ? this.normalQueue : this.oppositeQueue;
    if (!queue.find((i) => i.userId === item.userId)) {
      queue.push(item);
    }
  }
  
  async dequeuePair(mode: "normal" | "opposite"): Promise<[QueueItem, QueueItem] | null> {
    const queue = mode === "normal" ? this.normalQueue : this.oppositeQueue;
    
    if (mode === "opposite") {
      // For opposite mode, find pairs with different genders
      for (let i = 0; i < queue.length; i++) {
        for (let j = i + 1; j < queue.length; j++) {
          if (queue[i].gender !== queue[j].gender) {
            const a = queue.splice(j, 1)[0];
            const b = queue.splice(i, 1)[0];
            return [b, a];
          }
        }
      }
      return null;
    } else {
      // For normal mode, just pair any two users
      if (queue.length >= 2) {
        const a = queue.shift()!;
        const b = queue.shift()!;
        return [a, b];
      }
      return null;
    }
  }
  
  async remove(userId: string, mode: "normal" | "opposite") {
    const queue = mode === "normal" ? this.normalQueue : this.oppositeQueue;
    const index = queue.findIndex((i) => i.userId === userId);
    if (index !== -1) queue.splice(index, 1);
  }
}

class RedisQueue implements QueueDriver {
  private client: Redis;
  private normalKey = "z4rum:match_queue:normal";
  private oppositeKey = "z4rum:match_queue:opposite";
  
  constructor(url: string) {
    this.client = new Redis(url, { maxRetriesPerRequest: 1 });
  }
  
  async enqueue(item: QueueItem, mode: "normal" | "opposite") {
    const key = mode === "normal" ? this.normalKey : this.oppositeKey;
    const value = JSON.stringify(item);
    await this.client.lpush(key, value);
  }
  
  async dequeuePair(mode: "normal" | "opposite"): Promise<[QueueItem, QueueItem] | null> {
    const key = mode === "normal" ? this.normalKey : this.oppositeKey;
    
    if (mode === "opposite") {
      // For opposite mode, we need to find pairs with different genders
      // Get all items
      const items = await this.client.lrange(key, 0, -1);
      const parsed: QueueItem[] = items.map((i) => JSON.parse(i));
      
      // Find a pair with different genders
      for (let i = 0; i < parsed.length; i++) {
        for (let j = i + 1; j < parsed.length; j++) {
          if (parsed[i].gender !== parsed[j].gender) {
            // Remove both from queue
            await this.client.lrem(key, 1, JSON.stringify(parsed[i]));
            await this.client.lrem(key, 1, JSON.stringify(parsed[j]));
            return [parsed[i], parsed[j]];
          }
        }
      }
      return null;
    } else {
      // For normal mode, just get two items
      const first = await this.client.rpop(key);
      const second = await this.client.rpop(key);
      if (first && second) {
        return [JSON.parse(first), JSON.parse(second)];
      }
      if (first && !second) {
        await this.client.rpush(key, first);
      }
      return null;
    }
  }
  
  async remove(userId: string, mode: "normal" | "opposite") {
    const key = mode === "normal" ? this.normalKey : this.oppositeKey;
    const items = await this.client.lrange(key, 0, -1);
    for (const item of items) {
      const parsed: QueueItem = JSON.parse(item);
      if (parsed.userId === userId) {
        await this.client.lrem(key, 1, item);
        break;
      }
    }
  }
}

export class MatchService {
  private driver: QueueDriver;
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.driver = process.env.REDIS_URL ? new RedisQueue(process.env.REDIS_URL) : new InMemoryQueue();
    this.prisma = prisma;
  }

  async join(userId: string, mode: "normal" | "opposite" = "normal") {
    // Get user's gender
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const queueItem: QueueItem = { userId, gender: user.gender };
    await this.driver.enqueue(queueItem, mode);
    const pair = await this.driver.dequeuePair(mode);
    
    if (pair) {
      const [userA, userB] = pair;
      const session = await this.prisma.matchSession.create({
        data: { userAId: userA.userId, userBId: userB.userId, status: "active", isAnonymous: true },
      });
      return session;
    }
    return null;
  }

  async leave(userId: string, mode: "normal" | "opposite" = "normal") {
    await this.driver.remove(userId, mode);
  }

  async end(sessionId: string) {
    return this.prisma.matchSession.update({
      where: { id: sessionId },
      data: { status: "ended", endedAt: new Date() },
    });
  }
}
