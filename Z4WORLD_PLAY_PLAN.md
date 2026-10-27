# Z4world — playable polish, avatar persistence, review

Scope: implement all five approved proposals locally. Preserve the uncommitted
isometric art pass. No push/deployment before the user visually approves.

## 1. Character animation
- [x] Generate walk atlases (4 directions × 4 gait frames) for both avatars.
- [x] Generate separate seated and waving directional poses for both avatars.
- [x] Measure frame anchors, retain originals, produce WebP derivatives.
- [x] Render idle/walk/sit/wave states consistently for local and remote users.
- [x] Review seams, feet, identity, frame timing and reduced-motion behavior.

## 2. Movement and mobile
- [x] Analog joystick with dead zone, pointer capture, cancel/blur cleanup.
- [x] Click/tap the ground to walk, inverse projection and obstacle-aware A*.
- [x] Keyboard/joystick override a route; stop while seated or a dialog is open.
- [x] Camera tracks smoothly and clamps within the world, including mobile.

## 3. Map interactions
- [x] Nearby contextual actions: café seating, stand up, Game Club.
- [x] Game Club opens an accessible dialog for quiz/floor, not permanently
  expanded panels under the map; results and spectators remain supported.
- [x] Click/tap objects to approach; activate with button/E when in range.
- [x] Dialog focus, Escape, return focus and movement suspension tested.

## 4. Account appearance
- [x] Add WorldProfile model and additive SQL migration (no production DB writes).
- [x] Authenticated GET/PUT profile API, strict allowlist validation, safe errors.
- [x] Choose character, hair and clothing palette; preview before saving.
- [x] Save to account; broadcast authoritative appearance to peers and reload.
- [x] Isolated fixture and API tests verify persistence and malformed requests.

## 5. Acceptance, critique, fixes
- [x] Tests for projection/pathfinding/input bounds and profile validation.
- [x] Two-browser gameplay, saved appearance/reload/peer propagation, joystick,
  click-to-walk, obstacles, dialogs, waving/seating, desktop/mobile screenshots.
- [x] Multiple simultaneous clients: movement delivery/cleanup, not a claim of
  production capacity or phone FPS from headless Chromium.
- [x] TypeScript, relevant lint, backend tests/build, frontend production build.
- [x] Record actual findings, corrections, remaining limitations and captures.

## Initial critique and design decisions

1. A bounce on one idle image is not a walk animation. Use distinct gait frames;
   inspect them rather than claiming generated sheets are automatically coherent.
2. Tap-to-walk without pathfinding gets stuck against the fountain/buildings.
   Use a grid with inflated obstacles and diagonal corner checks. Server retains
   final authority; client stops/reports when a route cannot progress.
3. Permanent game panels distract from the world. Move them into one dialog and
   keep a status/notification cue when an active game is minimized.
4. Merely saving appearance to localStorage does not persist by account. Use a
   Prisma model/API; do not silently claim server persistence if save fails.
5. Changing the entire sprite hue also changes skin. Limit palette overlays to
   hair/clothing regions, inspect all states, retain an unmodified original mode.
6. Opening a dialog while holding a direction can cause runaway walking. Clear
   all input and suspend movement on open, blur, disconnect and unmount.
7. Migration changes must be additive and scoped. Validate/generated SQL locally;
   do not run against the existing .env DATABASE_URL without explicit authority.

## Final critique / verification record

### Findings and corrections

1. **Atlas feet drift:** scanning every opaque pixel could include a speck from
   the next atlas row. Anchors now use the largest connected opaque silhouette,
   then its lowest 12% for foot center. Source images/alpha remain untouched.
2. **Waypoint corner cutting:** a large arrival tolerance can turn before a grid
   corner. Tightened it to six units and padded client obstacles/trunks by ten
   units beyond server collision margins; server still applies every step.
3. **Mobile controls under bottom navigation:** added scroll margins for joystick
   and arrows; browser tests check real pointer interaction, release and blur.
4. **Held input across dialog/network changes:** opening a modal, focusing chat,
   blur and disconnect clear keys, joystick and route. Disconnect closes panels
   and resets the authoritative-position cache; seated controls are disabled.
5. **Unconfirmed wardrobe saves:** an aborted request must not close the dialog,
   discard the draft or display success. Tested retry, successful save, peer
   update, reload and actual database persistence after restarting the fixture.
6. **API abuse/data isolation:** complete enum allowlist, reject extra userId,
   infer owner from JWT, SQL constraints, additive FK with cascade; writes capped
   at 30 per minute/account with bounded limiter storage and Retry-After.
7. **New CJS asset script exposed an ESLint scope problem:** React-only relaxed
   rules were applied to files without the React plugin. Scoped them to UI file
   types and used dynamic imports in the Node script, without disabling checks.
8. **Accessibility/reduced motion:** native modal handles focus/Escape; map is a
   group rather than an image hiding interactive children; gait frames freeze,
   viewBox follows immediately and decorative transitions stop when requested.
   A deeper keyboard check found reverse Tab focused the dialog shell itself;
   added explicit first/last-control wrapping and checked restored opener focus.
9. **Keyboard after clicking navigation buttons:** button focus previously blocked
   movement keys, preventing manual override of an auto-route. Only text/select
   controls now suppress hotkeys; modal suspension still takes precedence.

### Verification

- Backend: `npm test` — 10 passing; `npm run build` — passing.
- Frontend geometry: five tests passing; TypeScript and scoped Z4world/script
  ESLint clean. Full-project lint: **0 errors, 126 existing warnings**.
- Optimized webpack production build passed; final browser checks run against
  `next start` on port 3300, not just the development server.
- `world.browser.cjs`: two authenticated contexts, proximity/table chat, true sit
  pose + movement lock, all five quiz questions and 500-point results, queue
  cancellation, floor elimination, disconnect/reload, mobile arrows, rejected
  JWT, twenty-person cap, movement from all twenty members, room invitations,
  duplicate-account takeover and zero client exceptions.
- `world.play.browser.cjs`: strict/unauthenticated profile API, ownership
  isolation, wardrobe preview/save failure/retry, peer appearance and reload,
  distinct gait frames/idle/wave, actual clicks routing around the fountain,
  contextual club, modal movement suspension/Escape, mobile joystick release and
  blur, reduced-motion frame freeze, responsive layout and zero exceptions.
- `world.profile.integration.ts`: PostgreSQL record survives fixture restart,
  SQL CHECK rejects invalid hair, and authenticated writes return 429 at limit.
- `world.art.browser.cjs`: all fourteen images decode, desktop/mobile layout,
  screen-space input, camera clamp/follow, pointer release and foliage occlusion.
- Assets: fourteen runtime WebPs total **2,088,310 bytes**; original generated
  PNGs and prompt provenance retained under `docs/z4world/art/`.

### Local reproduction (isolated test data only)

Use a disposable pgvector PostgreSQL on 127.0.0.1:55432, database `z4world_test`,
local-only password `z4world-local-test`. Set WORLD_TEST_DATABASE_URL explicitly;
the fixture refuses other database locations. Apply Prisma migrations using an
explicit DATABASE_URL pointing to that same disposable database. Never run these
checks against the existing .env database.

Backend: `JWT_SECRET=z4world-local-test-only WORLD_TEST_DATABASE_URL=... npm run
test:world:fixture`. Frontend build/dev needs NEXT_PUBLIC_API_URL and
NEXT_PUBLIC_SOCKET_URL set to `http://127.0.0.1:4400`; serve on port 3300.
Browser scripts need Playwright on NODE_PATH and Chrome (CHROME_PATH supported in
the existing suites). Run the world/art suites sequentially: they intentionally
reuse fixture users 0/1 and assume an empty initial room. The play suite uses
22/23. The DB persistence check expects the play suite's saved lavender/copper/
mint appearance, then a fixture restart to clear per-process write counters.

### Deliberate boundaries / deployment

- Local implementation only; **not committed, pushed or deployed**. No production
  data touched. Deploy the additive migration before using the new profile API.
- Four gait frames/direction at roughly 7 FPS and two base characters: a small
  stylized atlas, not a skeletal animation/custom garment editor. Palette tint
  is intentionally limited to hair/garment regions and leaves skin unchanged.
- Seating currently uses the two café tables, not decorative park benches.
- Analog joystick controls direction; speed remains fixed by the server.
- Rooms, game state, rate limits and appearance broadcasts are process-local;
  horizontal multi-instance world hosting still needs a shared realtime layer.
  Account appearance itself is PostgreSQL-persisted.
- Twenty-client delivery is a functional check, not production load certification
  or measured FPS on physical Android/iOS devices. Those checks remain a release
  follow-up. Existing global lint warnings and build's baseline-data/multiple-
  lockfile warnings were not swept into unrelated refactors.

Captures: `docs/z4world/art/play-desktop.png`, `play-mobile.png`,
`play-wardrobe.png`, `play-mobile-wardrobe.png`, and the art review captures.
