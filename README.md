<div align="center">

<img src="frontend/app/icon.png" alt="Z4rum logo" width="88" />

# Z4rum

### Chỗ anh em lên tiếng.

**A Vietnamese social network that puts a forum, chat with strangers, AI role-play and watch-together film rooms in one place.**

![Next.js](https://img.shields.io/badge/Next.js_16-101010?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-101010?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-101010?logo=typescript&logoColor=3178C6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-101010?logo=tailwindcss&logoColor=06B6D4)
![Express](https://img.shields.io/badge/Express_5-101010?logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-101010?logo=socketdotio&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-101010?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-101010?logo=postgresql&logoColor=4169E1)

[What's inside](#whats-inside) · [Tour](#a-tour-of-the-app) · [How it's built](#how-its-built) · [Run it locally](#run-it-locally) · [Testing](#testing) · [Deployment](#deployment)

</div>

<br />

<p align="center">
  <img src="docs/images/feed.webp" alt="The Z4rum home feed, with navigation on the left and announcements on the right" width="100%" />
</p>

## What's inside

Z4rum is a full-stack project built around one idea: a place to hang out online, whether that means telling a story, meeting someone new, or watching a film with friends.

| | Feature | What you do there |
|:-:|---|---|
| 🏠 | **Chuyện anh em** | Post, like, comment and follow what people are talking about |
| 🔍 | **Tìm kiếm** | Find people and posts |
| ✉️ | **Nhắn tin** | Message friends one to one, in real time |
| 💞 | **Chat với người lạ** | Get matched with a stranger for a chat without names |
| ✨ | **Z4chat** | Create AI characters and stories, then role-play with them |
| 🎬 | **Z4theater** | Open a private room and watch a film in sync with friends |
| 📊 | **Bình chọn** | Run time-limited polls and argue about the results |

It works on desktop and phone, can be installed as a PWA, and supports sign-in with email or Google.

> Screenshots in this README come from the real app, running on sample data.

## A tour of the app

### 🏠 Community

The feed is the front page of Z4rum. Posts can carry an image, likes update live for everyone, and comments sit right under each post. New posts pass through keyword moderation, which handles letter case, Unicode tricks, invisible characters and split-up phrases without touching ordinary Vietnamese words.

Each member has a profile with a bio, an avatar and their posts. Search finds people and posts, and conversations carry on in real-time direct messages.

<table>
  <tr>
    <td width="72%"><img src="docs/images/profile.webp" alt="A member's profile with their bio and posts" /></td>
    <td width="28%"><img src="docs/images/feed-phone.webp" alt="The feed on a phone" /></td>
  </tr>
</table>

### 💞 Chat với người lạ

Press a button and get paired with whoever else is waiting. The chat screen doesn't show who the other person is, and either side can leave at any time.

- **Two modes:** match with anyone, or only with the opposite gender.
- **Real-time:** runs entirely on Socket.IO.
- **Flexible queue:** held in memory by default, or in Redis when `REDIS_URL` is set.

<p align="center">
  <img src="docs/images/stranger-chat.webp" alt="A conversation between two matched strangers" width="78%" />
</p>

### ✨ Z4chat

An AI role-play space where you write the characters and the plot. The hard part of AI role-play is keeping a character consistent over a long story, so most of the work went there.

- **Characters and stories.** Define a character's personality, way of speaking and sample dialogue, then pair them with any story, including the role you play in it. AI can draft either one from a short brief.
- **Memory in layers.** The character sheet and story are always in the prompt, older turns are folded into a rolling summary, and key facts are pinned so they can't be forgotten. You can see and edit what a character remembers.
- **Replies that don't repeat.** Each reply is checked for similarity to recent ones, and the shape of replies is varied turn by turn.
- **Characters who message first.** Timing follows the clock in Vietnam and how long you've been away, so a character might say goodnight when it's late.
- **Your choice of model.** Works with OpenRouter, Gemini, Groq, DeepSeek and OpenAI, with streaming replies.

<p align="center">
  <img src="docs/images/z4chat-session.webp" alt="A role-play conversation with an AI character in a detective story" width="78%" />
</p>

### 🎬 Z4theater

Pick a film, open a private room and send the link. Everyone sees the same moment and chats beside the picture.

- **Real playback sync.** The host plays, pauses and seeks for the room. Small drift is corrected by playback speed and large drift by seeking, and anyone can step out and rejoin.
- **No account needed to watch.** Guests can browse, watch alone and follow an invite. Logging in to invite or chat brings them back to the same moment.
- **Finding films.** Suggestions as you type, ranked search, and filters by genre, country, year, language and sort that combine freely.
- **Two film sources.** If the primary source fails, the catalog and the player move to the backup.
- **Your library.** "Continue watching" remembers the exact moment, and saved films stay on the device.
- **Light on phones.** Native HLS on Apple devices, and posters shrunk to about 13 KB each.

<table>
  <tr>
    <td width="76%"><img src="docs/images/catalog.webp" alt="The Z4theater catalog with search, filters and posters" /></td>
    <td width="24%"><img src="docs/images/catalog-phone.webp" alt="The catalog on a phone" /></td>
  </tr>
</table>

Z4rum stores no films. Z4theater plays what third-party sources publish, and their licensing has not been verified. Films marked 18+, and films with no category, are hidden.

### 📊 Bình chọn

Anyone can start a poll with a title, a description and several options. Polls run for a set time, each person votes once, and results show as percentages. Every poll has its own discussion, where comments can include an image.

<p align="center">
  <img src="docs/images/vote.webp" alt="Polls showing options with vote counts and percentages" width="78%" />
</p>

## How it's built

```mermaid
flowchart LR
    B["Browser"]

    subgraph V["Vercel"]
        N["Next.js app"]
        A["AI routes"]
        O["Poster optimizer"]
    end

    subgraph R["Render"]
        E["Express API"]
        S["Socket.IO"]
    end

    P[("PostgreSQL")]
    RD[("Redis<br/>optional")]
    AI["AI providers"]
    F["Film sources"]

    B --> N
    B -->|"REST"| E
    B <-->|"realtime"| S
    B --> A --> AI
    B -->|"catalog, streams"| F
    O --> F
    E --> P
    S --> P
    S -.-> RD
```

| Layer | Stack |
|---|---|
| **Frontend** | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, TanStack Query, Zustand, Axios, Socket.IO client, hls.js |
| **Backend** | Node.js, Express 5, TypeScript, Socket.IO, JWT, bcrypt, Google sign-in |
| **Data** | PostgreSQL with Prisma, optional Redis for the matching queue |
| **Services** | Cloudinary for images, five AI providers for Z4chat, two film sources for Z4theater |

A few decisions worth knowing:

- **AI keys never leave the frontend host.** Inference runs in Next.js route handlers, and prompts are built on the server, so memory and guardrails can't be skipped from the browser.
- **Guests are kept apart.** Everything on the main Socket.IO namespace requires a login. Z4theater has its own `/theater` namespace where the token is optional, so guests never reach account events.
- **Theater rooms live in memory.** They are not stored and close on restart, so the backend runs as a single instance. Rooms share only ids and playback state, so nobody can push text or a player URL to other viewers.

### Repository layout

```text
Z4rum/
├─ frontend/                Next.js app
│  ├─ app/                  Pages and API routes, one folder per feature
│  └─ lib/                  Stores, API clients, Z4chat and theater logic
├─ backend/
│  ├─ src/modules/          auth, user, post, friend, message, match, vote, z4chat
│  ├─ src/theater/          Watch-together rooms
│  ├─ src/socket.ts         Real-time events
│  ├─ prisma/               Schema and migrations
│  └─ tests/                Unit, browser and live checks
├─ docs/                    Design notes and images
└─ render.yaml              Backend service for Render
```

### API at a glance

| Base path | Covers |
|---|---|
| `/auth` | Register, log in, Google sign-in, current user |
| `/users` | Search, profiles and profile updates |
| `/posts` | Feed, posts, likes and comments |
| `/friends` | Friend requests and friend lists (API only, not yet in the interface) |
| `/messages` | Direct message history and sending |
| `/match` | Starting and stopping matching |
| `/votes` | Topics, voting and comments |
| `/z4chat` | Characters, stories, sessions, messages and memories |
| `/api/z4chat/*` | AI replies, summaries and drafts, served by Next.js |

Most routes need an `Authorization: Bearer <token>` header. Real-time features use Socket.IO events such as `match:join`, `dm:send` and, on `/theater`, `theater:sync`.

## Run it locally

**You need** Node.js 20 or newer, npm and PostgreSQL 14 or newer.

```bash
git clone https://github.com/Huy-Nguyen-Chualambo/Z4Rum-social-media-app.git
cd Z4Rum-social-media-app

(cd backend && npm install)
(cd frontend && npm install)
```

Create `backend/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/z4rum?schema=public
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:3000
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# Z4chat needs at least one of these
OPENROUTER_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
```

Set up the database, then run each app in its own terminal:

```bash
cd backend
npx prisma migrate dev
npm run dev
```

```bash
cd frontend
npm run dev
```

Open <http://localhost:3000>.

<details>
<summary><b>Optional settings</b></summary>

| Variable | Where | Enables |
|---|---|---|
| `REDIS_URL` | backend | A Redis matching queue. Without it the queue is held in memory |
| `GOOGLE_CLIENT_ID` | backend | Google sign-in |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | frontend | Google sign-in button |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | frontend | Image uploads |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | frontend | Image uploads |
| `WEATHERAPI_KEY` or `WEATHERSTACK_API_KEY` | frontend | The weather in the top bar |
| `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME` | frontend | How the app identifies itself to OpenRouter |

</details>

## Testing

Run these from `backend/`:

| Command | What it checks |
|---|---|
| `npm test` | Post moderation and theater rooms |
| `npm run test:frontend` | Theater logic: sync, search, film parsing, caching and library |
| `npm run test:theater:live` | The real film sources still match what the app expects. Needs network access |
| `npm run test:theater:browser` | Theater flows in Chrome, on desktop and phone sizes |

Automated tests currently cover post moderation and Z4theater; the other features don't have tests yet. The browser checks need extra setup, described in the [theater design notes](docs/Z4THEATER_PLAN.md#test). They use in-memory users and never connect to a database.

## Deployment

| Part | Host | Settings |
|---|---|---|
| **Frontend** | Vercel | Root directory `frontend`, framework preset Next.js |
| **Backend** | Render | Defined in [`render.yaml`](render.yaml), with `autoDeploy` on |
| **Database** | Any PostgreSQL | Set `DATABASE_URL` on the backend |

> [!IMPORTANT]
> Pushing to `main` deploys the backend straight away, and theater rooms in progress close when it restarts.

> [!NOTE]
> On Render's free plan the backend sleeps when idle and takes a while to wake, so the first request after a quiet spell can be slow.

## License

This project is for portfolio and learning purposes.
