import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/post.js";
import matchRoutes from "./routes/match.js";
import initSocket from "./socket.js";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/post", postRoutes);
app.use("/api/match", matchRoutes);

// HTTP + Socket
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Socket logic
initSocket(io, prisma);

server.listen(process.env.PORT || 8080, () =>
  console.log(`🚀 Server running on port ${process.env.PORT || 8080}`)
);
