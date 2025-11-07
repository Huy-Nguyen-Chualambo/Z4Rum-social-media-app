import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import postRoutes from "./modules/post/post.routes";
import friendRoutes from "./modules/friend/friend.routes";
import messageRoutes from "./modules/message/message.routes";
import matchRoutes from "./modules/match/match.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/friends", friendRoutes);
app.use("/messages", messageRoutes);
app.use("/match", matchRoutes);

export default app;
