# Z4world — isometric art implementation and review

Status: implementation and verification complete; awaiting visual approval. Local review build only; do not push/deploy this art pass
before the user has inspected the integrated result.

## Approved direction

Reference: `docs/z4world/art/approved-study.png` (the user-approved generated sheet).
Warm pastel Vietnamese toy-town, chibi avatars, orthographic 2:1 isometric ground,
upper-left light, peach tiled café, lavender Game Club, sage foliage and cream paving.

## Sequence and acceptance gates

1. [x] Preserve reference and write asset manifest/prompt provenance.
   Record names, anchors, dimensions, intended footprint and generated source.
2. [x] Generate separated transparent assets: café, Game Club, fountain, tree,
   bench, café table/chairs, streetlamp, chibi avatar directions.
   Inspect silhouettes, camera, alpha and detail at actual displayed size.
3. [x] Prepare web derivatives without destructive changes to generated sources.
   Use WebP with alpha, bounded dimensions, explicit anchors; target all runtime
   image files together below 3 MB. Keep source/reference outside public/.
4. [x] Extract rendering from the existing page into a typed scene component.
   Preserve backend coordinates/collision and gameplay; only project rendering.
   Sort avatars and props together by ground depth, preserve table interaction.
5. [x] Integrate visual composition: readable paths and entrances, restrained
   vegetation, readable avatar labels/bubbles, warm scene frame and minimap info.
   Camera overview/follow, mobile usability, touch and keyboard stay functional.
6. [x] Review critically using desktop/mobile screenshots and live browser checks.
   Fix actual findings, record what was changed and what remains limited.
7. [x] Run TypeScript, relevant lint, backend tests/build and frontend production
   build; rerun two-browser gameplay for projection regressions.
8. [x] Deliver screenshot, asset inventory, review notes and local file paths.
   Keep the art pass unpushed for visual approval.

## Initial critique → design revisions

- A presentation sheet cannot be used as a production atlas: baked background,
  labels, inconsistent scales and combined furniture prevent clean overlap.
  Revision: generate isolated assets from the approved reference with alpha.
- Micro-details disappear on a phone. Revision: reduce flowers/sign text,
  emphasize roof/door silhouettes, test the actual scaled scene.
- Replacing the whole map with one beautiful painting breaks walking behind
  trees, seating and collision. Revision: code-drawn projected ground plus
  separate raster sprites sharing a measured ground anchor and depth order.
- Rotating only the floor but not the controls makes arrows confusing.
  Revision: define screen-to-world movement explicitly and test screen direction.
- AI character sheets can have inconsistent frames. Revision: start with a
  small inspected directional set; do not claim a complete eight-direction
  walk-cycle atlas. Add subtle procedural stepping to consistent sprites.
- Roofs can obscure players and chat. Revision: fade an occluding sprite when
  the local player is behind it and keep speech/name overlays above scenery.
- Multiple users at the same spawn overlap. Revision: separate spawn slots on
  the backend while preserving existing gameplay constraints.
- The existing global page layout leaves a narrow stage. Revision: improve the
  world viewport and follow camera inside its existing shell first, without
  changing navigation or unrelated pages.

## Final review findings and corrections

| Finding | Correction | Evidence |
| --- | --- | --- |
| Whole-map overview makes players too small on phones. | Mobile defaults to follow camera; overview remains available. Camera interpolation reduces jumps. | Mobile browser capture and camera-toggle assertion. |
| Server coordinates rotated visually but old controls follow world axes. | Invert the projection for keyboard and touch input; support uppercase WASD. | Geometry tests plus real pointer hold/release on desktop/mobile. |
| Feet in generated atlas cells have different baselines. | Measure each cell's alpha bounds; use per-frame ground anchors with quadrant clipping, without changing original PNGs. | `avatar-frames.json` generated from derivatives and in-scene captures. |
| Scenery can hide a player completely. | Sort actors/props by ground depth, fade occluding scenery to 35%, render labels/bubbles separately above it. | Browser physically walks behind a tree and asserts fade; `review-occlusion.png`. |
| Several arrivals spawn on top of each other. | Server chooses a free, spaced spawn slot. | Two-browser replay and existing membership tests. |
| Trees look solid but previously had no trunk collision. | Add small trunk collision circles matching their map locations. | Updated collision test and final two-browser replay. |
| Source PNGs are too large to serve directly. | Preserve all sources and produce cached WebP derivatives with alpha; enforce 3 MiB aggregate cap. | Ten runtime assets total 795,104 bytes. |

## Asset inventory

- Runtime: `frontend/public/z4world/assets/` — ten WebP files and manifest.
- Original PNGs: `docs/z4world/art/sources/` — eight props, two directional atlases.
- Prompts: `docs/z4world/art/PROMPTS.md` — built-in image_gen provenance and briefs.
- Geometry/anchors: `frontend/lib/world/`; renderer: `frontend/app/z4world/_components/`.
- Rebuild derivatives: `node frontend/scripts/prepare-world-assets.cjs`.

## Limits of this art pass

The two characters have four inspected idle directions and a procedural stepping
effect; this is not a full frame-by-frame walk/sit/wave animation set. Seating
currently repositions/compacts the idle sprite over a chair rather than using a
separate authored seated pose. Avatars are assigned deterministically; a wardrobe
or persisted avatar selector is not part of this pass. These need their own asset
iteration, not a claim that the entire animation pipeline is finished.

Gameplay remains single-backend and ephemeral as documented in Z4WORLD_PLAN.md.
This work is held locally for visual review and has not been pushed/deployed.

## Verification record — 2026-10-27

- Backend: 8/8 tests passed; production build passed.
- Projection/camera geometry: 2/2 tests passed.
- TypeScript and scoped ESLint (`app/z4world`, `lib/world`) passed.
- Frontend Webpack production build passed with the existing multiple-lockfile
  and baseline-browser-mapping notices.
- `world.art.browser.cjs`: all ten WebPs decoded in Chromium, desktop/mobile
  overflow checks, screen-space pointer movement/release, camera toggle and
  physical walk-behind-tree fade all passed, with no page exceptions.
- Updated `world.browser.cjs`: full two-player seating/private chat, five quiz
  answers/results, floor elimination, reload/reconnect, mobile controls, rejected
  invalid JWT, 20-player capacity, room invites and duplicate-account tests passed.
- Captures: `review-desktop.png`, `review-mobile.png`, `review-closeup.png`,
  `review-occlusion.png` in `docs/z4world/art/`.
- Development/test servers were stopped after verification; no production
  database changes, deployment or Git push were performed.

To repeat art checks, run the fixture/frontend commands from Z4WORLD_PLAN.md,
then run `NODE_PATH=/path/to/playwright/node_modules node backend/tests/world.art.browser.cjs`
from the repository root. Geometry checks from frontend/:
`node --import ../backend/node_modules/tsx/dist/loader.mjs --test lib/world/projection.test.ts`.
