import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import app from "./app";
import { prisma } from "./utils/prisma";
import { initSocket } from "./socket";
import { setIO } from "./realtime";

dotenv.config();

const preferredPort = Number(process.env.PORT) || 4000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || "*" },
});

initSocket(io, prisma);
setIO(io);

function listenOn(port: number) {
  server.removeAllListeners("error");
  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      console.error(`\n❌ Port :${port} is already in use.`);
      console.error(`   Please stop the process using port ${port} first:`);
      console.error(`   - Linux/Mac: lsof -ti :${port} | xargs kill -9`);
      console.error(`   - Windows: netstat -ano | findstr :${port} (then taskkill /PID <pid> /F)\n`);
      process.exit(1);
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    console.log(`🚀 Z4rum backend running on :${port}`);
  });
}

listenOn(preferredPort);
