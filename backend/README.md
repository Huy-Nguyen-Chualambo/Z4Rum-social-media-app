# Z4rum Backend (Express + TypeScript + Prisma + Socket.IO)

## Requirements
- Node.js 18+
- PostgreSQL (Supabase/Neon ok)
- (Optional) Redis (Upstash) for match queue

## Environment variables (.env)
```
DATABASE_URL="postgresql://postgres:password@db:5432/postgres"
JWT_SECRET="z4rum_secret_dev"
PORT=4000
REDIS_URL="" # leave empty for in-memory queue
MESSAGE_RETENTION_HOURS=48
CLIENT_ORIGIN="http://localhost:3000"
```

## Install & Run (dev)
```
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

### Troubleshooting: Port already in use
If you see `EADDRINUSE` error, stop processes on ports 8080-8082:

**In WSL/Ubuntu:**
```bash
cd backend
bash kill-port.sh
# Or run each port separately:
sudo lsof -ti :8080 | xargs kill -9
sudo lsof -ti :8081 | xargs kill -9
sudo lsof -ti :8082 | xargs kill -9
```

**In Windows PowerShell:**
```powershell
netstat -ano | findstr :8080
taskkill /PID <pid> /F
```
**or**
sudo kill -9 <PID>

Then restart:
```bash
npm run dev
```

## Build & Start
```
npm run build
npm start
```

## REST API (base: /)
- POST /auth/register
- POST /auth/login
- GET /auth/me
- GET /users/:id, PUT /users/:id, GET /users?search=...
- POST /posts, GET /posts?limit=&cursor=, GET /posts/:id, DELETE /posts/:id
- POST /friends/request/:receiverId, POST /friends/accept/:requestId, GET /friends
- GET /messages/:userId
- POST /match/start, POST /match/stop

All routes except `/auth/*` require `Authorization: Bearer <token>`.

## Socket.IO Events
Client → Server:
- auth:handshake { token }
- match:join, match:leave
- message:send { sessionId, from, content }
- session:end { sessionId, by, reason? }
- session:report { sessionId, offenderId, reason }

Server → Client:
- match:found { sessionId, peer }
- message:receive { sessionId, from, content, createdAt }
- session:ended { sessionId, by, reason }
- match:queueStatus { position }
- error { code, message }

## Deploy (Railway/Render)
- Set env vars above
- `npm run build` then start with `node dist/server.js`
