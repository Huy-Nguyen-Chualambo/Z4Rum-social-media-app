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

## 4. Full-screen play page
- [x] `/z4world` is a landing page; the game moved to `/z4world/play`, without the
  site navigation. Old `/z4world?room=` invitations redirect to the game.
- [x] The camera matches any screen shape, with a floating HUD over the map.
- [x] Touch: joystick and on-demand chat that stays above the keyboard. Dialogs and
  the floor board fit short landscape screens.
- [x] Landscape is suggested, never required: portrait stays playable. Android also
  tries full screen + landscape lock on entry; refusals are ignored.

## 5. Night restyle to match the site
- [x] Scenery graded for the site's dark theme by `prepare-world-assets.cjs`; lit
  windows stay warm. Original PNGs are untouched.
- [x] HUD, dialogs and landing use the site's palette, square corners and blue accent.
- [x] One dock for chat, emotes, wardrobe, invite and camera.
- [x] One tap on a table or Game Club walks there and acts; manual movement cancels.
  The current action appears under the player's name, with E on desktop.
- [x] Surrounding city, lamp light and three decorative passers-by. They are local
  only: not players, not synced, not counted in the room.
- Mini games were deferred in this round, then removed in section 7.

## 6. Movement over real networks

Localhost hides latency, so tap-to-walk looked fine there and circled forever in
production from about 80ms round trip. The client now steers by the server
position plus its unconfirmed moves (`frontend/lib/world/movement.ts`). The server
limits the average move rate rather than each gap, and answers every move it
drops. `movement.test.ts` plays routes against the real server rules with delay
and jitter; run new movement changes through it, not just the localhost E2E.

## 7. Cinema replaces Game Club

- Quiz and disappearing floor are removed; commit `a19859d` is the last one with
  them, if they come back. Sections 2 and 2b describe that earlier work.
- `frontend/lib/world/movies.ts` reads two sources from the browser, with a 5 minute
  cache and one request per URL. phimapi.com is primary: it gives direct HLS links, played
  by `HlsPlayer.tsx` with hls.js. phim.nguonc.com is the backup: embeds only.
- If the primary fails while listing, the cinema moves to the backup by itself, unless
  the viewer chose that source. A stream that fails moves to the same film on the other
  source, matched by title and year. Viewers can also switch by hand.
- Films labelled 18+, or with no categories, stay hidden on both sources and in
  screenings. phimapi lists carry categories; nguonc needs one lookup per film.
- A screening shares only ids and playback state, so nobody can push text or a player
  URL to others. The server holds the position (the host reports play, pause, seek and a
  5 second heartbeat). `screeningSync.ts` keeps viewers on it: small drift by speed,
  more than 3 seconds by seeking. A viewer who pauses or seeks leaves until they rejoin.
- It ends when the host stops or leaves; closing the player pauses the room.
- Backup embeds cannot be synced or controlled. They are sandboxed against popups and
  redirects, need a referrer, and their bot protection blocks automated browsers, so
  real embed playback still needs a person to check it.
- `backend/tests/world.cinema.browser.cjs` runs both sources against mocks, with real video
  from `backend/tests/fixtures/hls` (a synthetic ffmpeg `testsrc2` pattern).
- `frontend/scripts/make-cinema-art.cjs` derives the building from the Game Club art.

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

Run the existing backend/frontend development commands, open `/z4world` and
choose "Vào thế giới".
Use two different accounts in separate browsers (one account has one active
world presence). Confirm both appear in the same room, movement is visible,
the fountain/buildings block walking, and nearby chat arrives on both screens.
Separate by more than 250 map units and verify chat no longer arrives remotely.
Walk both avatars to the area below the cinema at the top right, open a film,
submit answers, wait for all five rounds, then compare the final leaderboard.
Disconnect one browser and verify its avatar is removed; reopen and verify
rejoin. Mobile checks: hold/release the joystick, open chat and type without
moving the avatar, then rotate the phone in both directions.

Deploy frontend and backend together using the existing environment variables.
The backend must run as one instance: room membership and screenings are held
in memory. Restarting it clears rooms and screenings. Multiple backend
instances need shared state/room ownership and Socket.IO adapter work first.
No persistent rewards are granted by this alpha. Café tables below the building
accept up to two players; stand up before moving. Select the table channel for
messages visible only to people currently seated at the same table.

## Reproducible checks

Backend: `npm test` and `npm run build`. Frontend: `npx tsc --noEmit`,
`npx eslint app/z4world/page.tsx`, `npm run build -- --webpack`.

For browser E2E use three terminals:

1. Backend: `JWT_SECRET=z4world-local-test-only npm run test:world:fixture`
2. Frontend: `NEXT_PUBLIC_API_URL=http://127.0.0.1:4400 NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:4400 npm run dev -- --port 3300 --webpack`
3. Backend: `NODE_PATH=/path/to/node_modules-containing-playwright npm run test:world:browser`

Check the full-screen layout on five screen sizes with
`node backend/tests/world.fullscreen.browser.cjs` (set `WORLD_SHOT_DIR` for captures).

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
