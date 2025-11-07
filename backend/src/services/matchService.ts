import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";

type QueueDriver = {
  enqueue(userId: string): Promise<void>;
  dequeuePair(): Promise<[string, string] | null>;
  remove(userId: string): Promise<void>;
};

class InMemoryQueue implements QueueDriver {
  private queue: string[] = [];
  async enqueue(userId: string) {
    if (!this.queue.includes(userId)) this.queue.push(userId);
  }
  async dequeuePair() {
    if (this.queue.length >= 2) {
      const a = this.queue.shift()!;
      const b = this.queue.shift()!;
      return [a, b];
    }
    return null;
  }
  async remove(userId: string) {
    this.queue = this.queue.filter((id) => id !== userId);
  }
}

class RedisQueue implements QueueDriver {
  private client: Redis;
  private key = "z4rum:match_queue";
  constructor(url: string) {
    this.client = new Redis(url, { maxRetriesPerRequest: 1 });
  }
  async enqueue(userId: string) {
    await this.client.lpush(this.key, userId);
  }
  async dequeuePair() {
    const first = await this.client.rpop(this.key);
    const second = await this.client.rpop(this.key);
    if (first && second) return [first, second];
    if (first && !second) {
      await this.client.rpush(this.key, first);
    }
    return null;
  }
  async remove(userId: string) {
    await this.client.lrem(this.key, 0, userId);
  }
}

export class MatchService {
  private driver: QueueDriver;
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.driver = process.env.REDIS_URL ? new RedisQueue(process.env.REDIS_URL) : new InMemoryQueue();
    this.prisma = prisma;
  }

  async join(userId: string) {
    await this.driver.enqueue(userId);
    const pair = await this.driver.dequeuePair();
    if (pair) {
      const [userAId, userBId] = pair;
      const session = await this.prisma.matchSession.create({
        data: { userAId, userBId, status: "active", isAnonymous: true },
      });
      return session;
    }
    return null;
  }

  async leave(userId: string) {
    await this.driver.remove(userId);
  }

  async end(sessionId: string) {
    return this.prisma.matchSession.update({
      where: { id: sessionId },
      data: { status: "ended", endedAt: new Date() },
    });
  }
}
