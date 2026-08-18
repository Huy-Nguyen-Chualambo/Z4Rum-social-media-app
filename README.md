# Z4rum - Social Platform

Z4rum is a full-stack social media project built with Next.js and Node.js, focused on real-time interaction, community content, and modern UI/UX.

This repository contains both frontend and backend code in a monorepo structure.

## Demo Scope

Core user flows implemented:

- Authentication with JWT (register, login, current user)
- Profile view and profile update
- Social post feed with search, pagination cursor, likes, and comments
- Friend request flow
- One-to-one messaging API
- Real-time matching flow (Socket.IO)
- Voting topics with options, votes, and topic comments
- Z4chat: AI role-play chat with user-authored characters and stories, layered
  memory so the plot is not forgotten, anti-repetition, and characters that
  message you first
- Responsive web UI with desktop and mobile navigation
- Vercel Speed Insights integration on frontend

## Tech Stack

### Frontend

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- TanStack Query
- Zustand
- Axios
- Socket.IO client
- Vercel Speed Insights

### Backend

- Node.js + Express 5
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- Socket.IO

### Deployment

- Frontend: Vercel
- Backend: Render (see render.yaml)

## Repository Structure

```text
Z4rum/
├─ frontend/   # Next.js app
├─ backend/    # Express + Prisma API
├─ render.yaml # Render service config for backend
└─ README.md
```

## Local Development

### 1. Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+

### 2. Clone Repository

```bash
git clone https://github.com/Huy-Nguyen-Chualambo/Z4Rum-social-media-app.git
cd Z4Rum-social-media-app
```

### 3. Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 4. Configure Environment Variables

Create backend/.env:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/z4rum?schema=public
JWT_SECRET=replace-with-a-strong-secret
CLIENT_ORIGIN=http://localhost:3000
```

Create frontend/.env.local:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# Z4chat AI providers - at least one key is required for chat to work.
# Whichever keys are present show up in the model picker; the rest are hidden.
OPENROUTER_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
```

### 5. Setup Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### 6. Run in Development

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

## Build Commands

Backend production build:

```bash
cd backend
npm run build
npm run start
```

Frontend production build:

```bash
cd frontend
npm run build
npm run start
```

## Backend API Overview

Base URL (local): http://localhost:4000

### Auth

- POST /auth/register
- POST /auth/login
- GET /auth/me

### Users

- GET /users?search=
- GET /users/:id
- PUT /users/:id

### Posts

- POST /posts
- GET /posts?limit=&cursor=&authorId=&search=
- GET /posts/:id
- PUT /posts/:id
- DELETE /posts/:id
- POST /posts/:id/like
- GET /posts/:id/comments
- POST /posts/:id/comments

### Friends

- POST /friends/request/:receiverId
- POST /friends/accept/:requestId
- GET /friends

### Messages

- GET /messages
- GET /messages/:userId
- POST /messages/:userId

### Match

- POST /match/start
- POST /match/stop

### Votes

- GET /votes/topics
- GET /votes/topics/trending
- GET /votes/topics/:id
- POST /votes/topics
- POST /votes/topics/:id/vote
- GET /votes/topics/:id/comments
- POST /votes/topics/:id/comments

### Z4chat (AI role-play)

All routes require auth and are scoped to the calling user.

- GET/POST /z4chat/characters
- GET/PUT/DELETE /z4chat/characters/:id
- GET/POST /z4chat/stories
- GET/PUT/DELETE /z4chat/stories/:id
- GET/POST /z4chat/sessions
- GET/DELETE /z4chat/sessions/:id
- POST /z4chat/sessions/:id/messages
- PUT/DELETE /z4chat/sessions/:id/messages/:mid
- POST /z4chat/sessions/:id/seen
- PUT /z4chat/sessions/:id/summary
- PUT /z4chat/sessions/:id/model
- GET/POST /z4chat/sessions/:id/memories
- PUT/DELETE /z4chat/sessions/:id/memories/:mid
- POST /z4chat/sessions/:id/proactive
- GET /z4chat/proactive/due
- GET /z4chat/unread

AI inference lives in the Next.js app instead, so the provider keys never leave
the frontend host:

- POST /api/z4chat/chat (streaming reply)
- POST /api/z4chat/summarize
- POST /api/z4chat/generate (AI-drafted character/story)
- POST /api/z4chat/proactive
- GET /api/z4chat/models

Most routes require header:

```http
Authorization: Bearer <jwt_token>
```

## Frontend Routes

- /
- /home
- /explore
- /messages
- /messages/[userId]
- /match
- /z4chat
- /z4chat/[sessionId]
- /profile
- /settings
- /users/[id]
- /vote
- /login
- /register

`/movies` and `/movies/[slug]` now redirect to `/z4chat`.

## Deployment Notes

### Backend on Render

Configured in render.yaml:

- rootDir: backend
- buildCommand: npm ci --include=dev && npm run build
- startCommand: npm run start

### Frontend on Vercel

- Project root: frontend
- Framework preset: Next.js
- Build command: next build

## Troubleshooting

### 1. JSON parse errors in package.json or package-lock.json

This usually happens after conflict resolution using apply both changes and leaves duplicated JSON blocks.

Fix:

```bash
cd frontend
rm -f package-lock.json
npm install
```

Then verify build:

```bash
npm run build
```

### 2. Multiple lockfile warning in Next.js

If Next.js warns about multiple lockfiles, keep only lockfiles that belong to this project workspace when possible.

### 3. Missing module @vercel/speed-insights/next

Ensure dependency exists in frontend/package.json and run npm install inside frontend.

## Why This Project Matters

This project demonstrates practical full-stack engineering capability:

- Designing and shipping end-to-end user features
- Building real-time and REST APIs together
- Managing relational data with Prisma
- Handling modern frontend state and API cache patterns
- Preparing applications for cloud deployment workflows

## License

This project is for portfolio and learning purposes.
- GET /api/posts/:id/comments — Get comments for a post

Notifications
- GET /api/notifications — Get current user's notifications (auth)
- POST /api/notifications/mark-read — Mark notifications as read

Frontend overview (routes & main components)
Typical pages:
- / — Home / feed for logged-in users
- /explore — Discover posts and users
- /auth/login — Login page
- /auth/register — Register page
- /users/:username — Public profile & posts
- /posts/:id — Single post view & comments
- /settings — Profile settings (avatar upload, bio, account settings)
- /notifications — Notifications list

Components:
- Auth forms (LoginForm, RegisterForm)
- PostCard, PostList, PostEditor (create/edit)
- ProfileHeader, FollowButton
- CommentList, CommentForm
- NavBar, MobileNav, SearchBar, NotificationBell

Testing
- Backend: Jest / Supertest for API tests
- Frontend: Vitest / React Testing Library for unit & integration tests
Example commands (customize to your scripts):
```bash
# Run backend tests
cd server
npm test

# Run frontend tests
cd client
npm test
```

Linting & formatting
Use ESLint and Prettier to keep code consistent:
```bash
# Lint
npm run lint

# Format
npm run format
```
Husky pre-commit hooks can run lint-staged to format and lint only staged files.

Deployment
Common deployment patterns:
- Containerized deployment (build Docker images for server and client, push to Docker Hub, deploy to ECS / DigitalOcean / Render)
- Serverless frontend (Vercel / Netlify) + hosted backend (Heroku / Render / AWS)
- Monolithic (server serves static frontend assets) deployed to a VM or platform like Render/Heroku

Example: Deploying frontend to Vercel and backend to Render
1. Push frontend repo to Vercel — set VITE_API_URL to your backend URL.
2. Deploy backend to Render or Heroku, configure environment variables (DATABASE_URL, JWT_SECRET, cloudinary keys).
3. Set CORS on backend to allow frontend domain.

Folder structure
(Adjust to your project folders — this is a suggested structure)
```
/
├─ client/                   # React frontend
│  ├─ public/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ pages/
│  │  ├─ hooks/
│  │  └─ assets/
│  ├─ package.json
│  └─ vite.config.ts
├─ server/                   # Node + Express backend
│  ├─ src/
│  │  ├─ controllers/
│  │  ├─ services/
│  │  ├─ middlewares/
│  │  ├─ routes/
│  │  ├─ prisma/             # prisma schema & client
│  │  └─ index.ts
│  ├─ package.json
│  └─ prisma/
├─ .github/
│  └─ workflows/             # CI workflows
├─ docker-compose.yml
├─ README.md
└─ LICENSE
```

Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a branch: git checkout -b feat/your-feature
3. Implement your changes and add tests.
4. Run tests and linters locally.
5. Commit with descriptive message, push branch to your fork.
6. Open a Pull Request and describe the change and why it’s needed.
7. Link issues and keep PRs small and focused.

Guidelines
- Follow the code style (run npm run format).
- Add tests for new features/bugs.
- Use feature branches and descriptive commit messages.
- Respect maintainers' review comments.

Roadmap (suggested)
- Real-time notifications using WebSockets
- Direct messaging (DMs)
- Reactions & richer comment threads
- Content moderation tools / admin dashboard
- Pagination improvecom

Acknowledgments
Thanks to the open-source community and the many libraries that make building apps faster and more fun.

---
