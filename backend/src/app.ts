import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import postRoutes from "./modules/post/post.routes";
import friendRoutes from "./modules/friend/friend.routes";
import messageRoutes from "./modules/message/message.routes";
import matchRoutes from "./modules/match/match.routes";
import voteRoutes from "./modules/vote/vote.routes";
import z4chatRoutes from "./modules/z4chat/z4chat.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { profileRoutes, prismaProfileStore } from './world/profile.routes';
import { publishAppearance } from './world/appearance';
import { prisma } from './utils/prisma';

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: false }));
app.use(express.json({ limit: "1mb" }));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/friends", friendRoutes);
app.use("/messages", messageRoutes);
app.use("/match", matchRoutes);
app.use("/votes", voteRoutes);
app.use("/z4chat", z4chatRoutes);
app.use('/world', profileRoutes(prismaProfileStore(prisma), publishAppearance));

// Basic landing + health
app.get("/", (_req, res) => {
  res.type("text/plain").send("Z4rum API is running. See /auth, /users, /posts, /messages, /match, /votes, /z4chat");
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
