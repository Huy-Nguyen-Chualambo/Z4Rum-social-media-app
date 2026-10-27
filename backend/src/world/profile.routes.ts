import { Router } from "express";
import { authMiddleware } from "../utils/jwt";
import {
  defaultAppearance,
  parseAppearance,
  type Appearance,
} from "./appearance";
import type { ProfileStore } from "./profile.store";
export { prismaProfileStore } from "./profile.store";
export function profileRoutes(
  store: ProfileStore,
  publish: (userId: string, value: Appearance) => void,
) {
  const router = Router();
  const writes = new Map<string, { count: number; until: number }>();
  router.use(authMiddleware);
  router.get("/profile", async (req, res) => {
    const userId = (req as typeof req & { userId: string }).userId;
    const value = await store.read(userId);
    res.json(value ?? defaultAppearance(userId));
  });
  router.put("/profile", async (req, res) => {
    const value = parseAppearance(req.body);
    if (!value)
      return res
        .status(400)
        .json({ error: "Ngoại hình không hợp lệ", code: "INVALID_APPEARANCE" });
    const userId = (req as typeof req & { userId: string }).userId;
    const now = Date.now();
    for (const [id, entry] of writes) if (entry.until <= now) writes.delete(id);
    const entry = writes.get(userId) ?? { count: 0, until: now + 60_000 };
    if (entry.count >= 30 || (!writes.has(userId) && writes.size >= 10_000)) {
      res.setHeader(
        "Retry-After",
        Math.max(1, Math.ceil((entry.until - now) / 1000)),
      );
      return res
        .status(429)
        .json({
          error: "Bạn thay đổi ngoại hình quá nhanh. Hãy thử lại sau.",
          code: "RATE_LIMITED",
        });
    }
    entry.count++;
    writes.set(userId, entry);
    const saved = await store.save(userId, value);
    publish(userId, saved);
    res.json(saved);
  });
  return router;
}
