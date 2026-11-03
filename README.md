<div align="center">

<img src="frontend/app/icon.png" alt="Z4rum logo" width="88" />

# Z4rum

**A Vietnamese social platform for posting, chatting, role-playing with AI and watching films together.**

![Next.js](https://img.shields.io/badge/Next.js_16-101010?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-101010?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-101010?logo=typescript&logoColor=3178C6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-101010?logo=tailwindcss&logoColor=06B6D4)
![Express](https://img.shields.io/badge/Express_5-101010?logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-101010?logo=socketdotio&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-101010?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-101010?logo=postgresql&logoColor=4169E1)

[Features](#features) · [Architecture](#architecture) · [Getting started](#getting-started) · [Testing](#testing) · [Deployment](#deployment)

</div>

<br />

<p align="center">
  <img src="docs/images/catalog.webp" alt="The Z4theater catalog with search, filters and film posters" width="100%" />
</p>

## Features

### 🎬 Z4theater: watch together

Pick a film, open a private room and send the link. Everyone sees the same moment and chats beside the picture.

- **Real playback sync.** The host plays, pauses and seeks for the room. Viewers are corrected by playback speed for small drift and by seeking for large drift. Anyone can step out and rejoin.
- **No account needed to watch.** Guests can browse, watch alone and follow an invite link. Logging in to invite or chat brings them back to the same moment.
- **Finding films.** Suggestions as you type, ranked search, and filters by genre, country, year, language and sort that combine freely.
- **Two film sources.** If the primary source fails, the catalog and the player move to the backup. Viewers can also switch by hand.
- **Your library.** "Continue watching" remembers the exact moment, and films can be saved. Both stay on the device, so guests have them too.
- **Built for phones.** Native HLS on Apple devices, posters shrunk to about 13 KB each, and lists that open instantly on a return visit. A stalled request gets a second try after 2 seconds.

<table>
  <tr>
    <td width="76%"><img src="docs/images/film-detail.webp" alt="A film's detail page with rating, cast, trailer and episodes" /></td>
    <td width="24%"><img src="docs/images/catalog-phone.webp" alt="The catalog on a phone" /></td>
  </tr>
</table>

### ✨ Z4chat: AI role-play

Write your own characters and stories, then chat with them. Layered memory keeps the plot from being forgotten, replies avoid repeating themselves, and characters can message you first. It works with OpenRouter, Gemini, Groq, DeepSeek and OpenAI; the model picker shows whichever have a key.

### 💬 Social

| | |
|---|---|
| **Feed** | Posts with likes, comments, search, cursor pagination and keyword moderation |
| **People** | Profiles, friend requests and one-to-one messages |
| **Chat với người lạ** | Real-time matching with a stranger, with reporting |
| **Bình chọn** | Vote topics with options, trending and discussion |
| **Accounts** | Email and password or Google sign-in |
| **App** | Responsive desktop and mobile navigation, installable as a PWA |

## Architecture

```mermaid
flowchart LR
    B["Browser"]

    subgraph V["Vercel"]
        N["Next.js app"]
        O["Poster optimizer"]
        A["AI routes"]
    end

    subgraph R["Render"]
        E["Express API"]
        S["Socket.IO"]
    end

    P[("PostgreSQL")]
    AI["AI providers"]
    F["phimapi.com<br/>phim.nguonc.com"]

    B --> N
    B -->|REST| E
    B <-->|"realtime, rooms"| S
    B -->|"catalog and streams"| F
    B --> A --> AI
    O --> F
    E --> P
    S --> P
```

A few decisions worth knowing:

- **Film data goes straight from the browser to the sources.** Rooms share only ids and playback state, so nobody can push text or a player URL to other viewers.
- **Rooms live in memory in one backend process.** They are not stored, and a restart closes them, so the backend must run as a single instance.
- **Guests have a separate Socket.IO namespace.** `/theater` makes the token optional. The main namespace still refuses connections without one, so guests never reach account events.
- **AI keys stay on the frontend host.** Inference runs in Next.js route handlers and never passes through the browser or the Express API.

The theater is described in more depth in [docs/Z4THEATER_PLAN.md](docs/Z4THEATER_PLAN.md).

### Repository layout

```text
Z4rum/
├─ frontend/                Next.js app
│  ├─ app/                  Pages and API routes
│  │  ├─ z4theater/         Catalog, rooms and solo watching
│  │  └─ z4chat/            AI role-play
│  └─ lib/                  Stores, API clients, theater and chat logic
├─ backend/                 Express and Socket.IO API
│  ├─ src/modules/          auth, user, post, friend, message, match, vote, z4chat
│  ├─ src/theater/          Watch-together rooms
│  ├─ prisma/               Schema and migrations
│  └─ tests/                Unit, browser and live checks
├─ docs/                    Design notes and images
└─ render.yaml              Backend service for Render
```

## Getting started

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
| `npm test` | Backend unit tests: post moderation and theater rooms |
| `npm run test:frontend` | Frontend logic: sync, search, film parsing, caching, library |
| `npm run test:theater:live` | The real film sources still match what the app expects. Needs network access |
| `npm run test:theater:browser` | Theater flows in Chrome, on desktop and phone sizes |

The browser checks need Playwright, Chrome and a production frontend on port 3300 talking to a test server. That server uses in-memory users and never connects to a database. The film sources are replaced with a stand-in, which is why the live check exists. [The steps are in the theater notes](docs/Z4THEATER_PLAN.md#test).

## Deployment

| Part | Host | Settings |
|---|---|---|
| **Frontend** | Vercel | Root directory `frontend`, framework preset Next.js |
| **Backend** | Render | Defined in [`render.yaml`](render.yaml), with `autoDeploy` on |
| **Database** | Any PostgreSQL | Set `DATABASE_URL` on the backend |

> [!IMPORTANT]
> Pushing to `main` deploys the backend straight away, and rooms in progress close when it restarts.

> [!NOTE]
> On Render's free plan the backend sleeps when idle and takes a while to wake. Opening a room waits for it and tells the viewer what is happening.

## About the films

Z4rum stores no films. Z4theater plays what third-party sources publish, and their licensing has not been verified. Films marked 18+, and films with no category, are hidden.

## License

This project is for portfolio and learning purposes.
