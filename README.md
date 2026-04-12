# Z4Rum — Social Media App

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-brightgreen.svg)]
[![Frontend Build](https://img.shields.io/badge/frontend-built-yellowgreen.svg)]
[![Backend Build](https://img.shields.io/badge/backend-built-yellowgreen.svg)]

Z4Rum is a modern, full‑stack social media application designed for sharing posts, following users, liking and commenting, and managing user profiles. This repository contains the source code for both frontend and backend parts of the app and is intended to be a starting point for production deployments or educational projects.

This README is comprehensive — it contains everything you need to run, test, and contribute to the project.

Table of Contents
- Project overview
- Key features
- Architecture & tech stack
- Getting started (local development)
  - Prerequisites
  - Clone & install
  - Environment variables
  - Database setup & migrations
  - Run the app (dev & production)
- API overview (main endpoints)
- Frontend overview (routes & components)
- Testing
- Linting and formatting
- Deployment (Docker & example cloud deployments)
- Folder structure
- Contributing
- Roadmap
- Troubleshooting
- License & contact

Project overview
Z4Rum aims to provide a small-scale, production‑capable social network with:
- User authentication and session management (JWT)
- Profile management including avatars
- Post creation (text + images), edit, delete
- Feed showing posts from followed users
- Follow/unfollow system
- Likes and threaded comments
- Basic notifications
- Search users and posts
- Responsive UI for desktop & mobile

Key features (user stories)
- As a user, I can sign up, log in, and manage my profile.
- As a user, I can create posts with text and images.
- As a user, I can follow other users and see a feed of posts from people I follow.
- As a user, I can like and comment on posts.
- As a user, I receive simple notifications for relevant events (new follower, comment on my post).
- As an admin (if enabled), I can moderate posts and users.

Architecture & tech stack
This repository is structured as a full-stack monorepo with two primary directories:
- /client — React frontend (TypeScript + Vite or Create React App)
- /server — Node.js backend (TypeScript + Express) with Prisma ORM and PostgreSQL

Primary technologies used (customize to your implementation if different):
- Frontend: React, TypeScript, React Router, Tailwind CSS (or CSS Modules), Vite
- Backend: Node.js, TypeScript, Express, Prisma (PostgreSQL)
- Authentication: JSON Web Tokens (JWT)
- Image uploads: Cloudinary (recommended) or AWS S3 / local storage
- Database: PostgreSQL (production) / SQLite (local dev option)
- Development tooling: ESLint, Prettier, Husky (pre-commit hooks), Vitest/Jest
- Containerization: Docker & Docker Compose

If your codebase uses different tools (e.g., MongoDB, Next.js), swap the steps below to match your stack.

Getting started (local development)

Prerequisites
- Node.js (LTS >= 18)
- npm >= 8 or yarn
- PostgreSQL (or Docker if using containers)
- Git
- (Optional) Docker & Docker Compose
- (Optional) Cloudinary/AWS account for media uploads

Clone the repository
```bash
git clone https://github.com/Huy-Nguyen-Chualambo/Z4Rum-social-media-app.git
cd Z4Rum-social-media-app
```

Install dependencies
Assumes a client/ and server/ directory:

Frontend
```bash
cd client
npm install
# or
yarn
```

Backend
```bash
cd ../server
npm install
# or
yarn
```

Environment variables
Create .env files for server and client (if necessary). Example values below are recommended defaults — update them for your environment.

server/.env
```
# Server
NODE_ENV=development
PORT=4000

# Database (Postgres)
DATABASE_URL=postgresql://postgres:password@localhost:5432/z4rum_dev?schema=public

# Auth
JWT_SECRET=replace-this-with-a-strong-secret
JWT_EXPIRES_IN=7d

# File uploads (Cloudinary example)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional: local uploads
UPLOADS_DIR=./uploads

# Optional: email / notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=youruser
SMTP_PASS=yourpass
```

client/.env
```
VITE_API_URL=http://localhost:4000/api
VITE_APP_NAME=Z4Rum
```

Database setup & migrations
This example uses Prisma + PostgreSQL. If you are using another ORM/DB, adapt accordingly.

1. Create your database (Postgres):
```bash
# Using psql
createdb z4rum_dev
```

2. Generate Prisma client and run migrations:
```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
# Optionally seed data:
npx prisma db seed
```

If you prefer Docker for DB:
```bash
docker run --name z4rum-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=z4rum_dev -p 5432:5432 -d postgres:15
```

Run the app (development)
Backend (watch mode)
```bash
cd server
npm run dev
# Common commands:
# npm run dev      -> Start server with ts-node-dev / nodemon
# npm run build    -> Build TypeScript to dist/
# npm run start    -> Start production server (node dist)
```

Frontend (dev)
```bash
cd client
npm run dev
# or
npm start
```

Open the frontend in your browser (usually http://localhost:5173 or http://localhost:3000 depending on setup).

Run the app (production build)
1. Build frontend:
```bash
cd client
npm run build
# This will produce a /dist or /build folder depending on toolchain
```
2. Serve static build or configure server to serve frontend assets. Example with Express:
- Build client -> copy /client/dist into /server/public and start server in production mode.

Docker (quick local deployment)
A sample docker-compose.yml (place at repo root) might look like:
```yaml
version: "3.8"
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: z4rum_prod
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  server:
    build: ./server
    env_file:
      - ./server/.env
    ports:
      - "4000:4000"
    depends_on:
      - postgres

  client:
    build: ./client
    env_file:
      - ./client/.env
    ports:
      - "3000:3000"
    depends_on:
      - server

volumes:
  pgdata:
```

API overview (common endpoints)
Below are example endpoints. Check server/src/routes for the actual routes of your codebase.

Auth
- POST /api/auth/register — Register new user (body: { name, email, password })
- POST /api/auth/login — Login (body: { email, password }) → returns JWT
- POST /api/auth/refresh — Refresh token (optional)
- POST /api/auth/logout — Logout

Users
- GET /api/users — List or search users (query: q=)
- GET /api/users/:id — Get user profile and statistics
- PUT /api/users/:id — Update profile (auth required)
- POST /api/users/:id/follow — Follow a user (auth)
- POST /api/users/:id/unfollow — Unfollow a user (auth)

Posts
- GET /api/posts/feed — Get authenticated user feed (auth)
- GET /api/posts — Paginated global posts or search
- GET /api/posts/:id — Get single post with comments
- POST /api/posts — Create new post (auth, multi-part for images)
- PUT /api/posts/:id — Edit post (auth, owner)
- DELETE /api/posts/:id — Delete post (auth, owner)

Likes & Comments
- POST /api/posts/:id/like — Like post (auth)
- POST /api/posts/:id/unlike — Unlike post (auth)
- POST /api/posts/:id/comments — Add comment (auth)
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
