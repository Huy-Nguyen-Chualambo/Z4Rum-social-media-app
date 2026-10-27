# Z4world roadmap

## 1. Playable foundation
- [x] Authenticated rooms of up to 20 players; reconnect and leave cleanup.
- [x] Top-down plaza, café, park and game lobby; keyboard/touch movement.
- [x] Server-authoritative positions, collision, proximity chat and emotes.

## 2. First multiplayer game
- [x] Lobby queue and timed quiz rounds with server-scored answers.
- [x] Results, replay, disconnect cleanup.

## 2b. Social interactions and second game
- [x] Two café tables, two seats per table, server-checked seating and private table chat.
- [x] Disappearing-floor game: adjacent moves, warned/fallen tiles, elimination and replay.
- [x] Copy invitation link to the current public room; full rooms reject invited joins.
- [x] Optional follow camera, reconnect action, queue cancellation and mobile controls.
- [x] Unique quiz round IDs reject delayed/replayed answers; scores hidden until results.

## 3. Verification and delivery
- [x] Movement/collision/membership checks, TypeScript and new-page lint.
- [x] Backend and frontend (Webpack) production builds.
- [x] Document deployment limits and manual two-player smoke test.
- [x] Real two-browser E2E against isolated backend: chat, seating, full quiz,
  floor movement/elimination, reconnect/reload, mobile controls and room capacity.

## Later milestones (outside the playable MVP)
- Friend-specific notifications in addition to shareable room invitations.
- Rich avatar animations, sound and further camera polish.
- Persistent cosmetics and homes after database/product design.
- Shared room ownership and Redis adapter before running multiple servers.

The initial version uses original SVG/CSS map artwork, existing accounts and
Socket.IO. Live rooms and scores are ephemeral; no database migration is needed.

The subsequent isometric art pass is tracked separately in
[Z4WORLD_ART_PLAN.md](./Z4WORLD_ART_PLAN.md), including generated assets,
critical review, corrections and visual-approval status.

## Run and verify

Run the existing backend/frontend development commands and open `/z4world`.
Use two different accounts in separate browsers (one account has one active
world presence). Confirm both appear in the same room, movement is visible,
the fountain/buildings block walking, and nearby chat arrives on both screens.
Separate by more than 250 map units and verify chat no longer arrives remotely.
Walk both avatars to the area below Game Club at the top right, join quiz,
submit answers, wait for all five rounds, then compare the final leaderboard.
Disconnect one browser and verify its avatar is removed; reopen and verify
rejoin. Mobile checks: hold/release each direction button and type in chat
without moving the avatar.

Deploy frontend and backend together using the existing environment variables.
The backend must run as one instance: room membership and quiz timers are held
in memory. Restarting it clears rooms and unfinished matches. Multiple backend
instances need shared state/room ownership and Socket.IO adapter work first.
No persistent rewards are granted by this alpha. Café tables below the building
accept up to two players; stand up before moving. Select the table channel for
messages visible only to people currently seated at the same table.

Quiz and floor each have their own queue, and a player can join only one at a
time. Floor players tap a neighboring tile in the 6×6 arena to move; the server
checks adjacency, rate and tile availability. Warned tiles fall after 2.5 seconds.
An eight-round cap ends the match even if multiple players survive (a draw).
Leaving a live match forfeits participation; disconnecting removes the avatar.

## Reproducible checks

Backend: `npm test` and `npm run build`. Frontend: `npx tsc --noEmit`,
`npx eslint app/z4world/page.tsx`, `npm run build -- --webpack`.

For browser E2E use three terminals:

1. Backend: `JWT_SECRET=z4world-local-test-only npm run test:world:fixture`
2. Frontend: `NEXT_PUBLIC_API_URL=http://127.0.0.1:4400 NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:4400 npm run dev -- --port 3300 --webpack`
3. Backend: `NODE_PATH=/path/to/node_modules-containing-playwright npm run test:world:browser`

The browser script uses `/usr/bin/google-chrome`; set `CHROME_PATH` if needed.
Playwright must already be installed in that `NODE_PATH` directory.
The fixture binds only to localhost, signs isolated test-user JWTs and runs the
real Socket.IO handlers with a fake user repository. It never opens the project
database and is not imported into the production server. Desktop/mobile captures
are saved as `/tmp/z4world-desktop.png` and `/tmp/z4world-mobile.png`.

## Verification record — 2026-10-27

- Eight backend tests passed, including existing post moderation tests.
- Desktop and mobile Chromium E2E passed against the isolated live fixture.
- Full quiz completed with both players scoring 500; floor movement/elimination
  and queue cancellation passed.
- Private table chat, out-of-range proximity isolation, reconnect/reload,
  rejected invalid JWT, 20-player capacity, full-room invite rejection and
  duplicate-account takeover passed over actual Socket.IO connections.
- Backend production build and frontend Webpack production build passed.
- Project ESLint: zero errors, 126 existing warnings; new world page is clean.
- This does not certify a 20-player production load test or multi-instance support.
