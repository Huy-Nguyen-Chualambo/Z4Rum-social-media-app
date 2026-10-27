# Art provenance and prompt set

Created with the built-in `image_gen` tool, using `approved-study.png` as the
style reference for every separate asset. Each call requests true transparency.
The reference is the user-approved concept from this chat, not a runtime atlas.

Shared production brief: isolated 2.5D isometric game sprite, orthographic camera,
2:1 ground axes, front and right sides visible, warm upper-left light, soft short
contact shadow; charming matte clay-painted pastel toy town. Entire object in
frame, transparent padding, no backdrop, labels, watermark or unrelated objects.
Simplify tiny details for mobile. Preserve the original PNGs; generate WebP
derivatives with `frontend/scripts/prepare-world-assets.cjs`.

| Asset | Subject-specific prompt |
| --- | --- |
| cafe | Vietnamese café, peach terracotta roof, cream wall, sage shutters, mint/cream striped awning, dark timber door, single CAFE sign and modest flower pots; rectangular 230×130 footprint, compact 1.5 floors, entrance facing down-left. |
| game-club | Lavender Game Club, cream trim, rounded facade, controller sign, glass double door, restrained warm glow; same footprint/height as café, single GAME CLUB sign. |
| fountain | Round warm-cream two-tier stone fountain, turquoise water, delicate streams, subtle moss and two flowers at base, no surrounding garden. |
| tree | Rounded sage/mint shade tree, warm brown trunk visible, softly clumped foliage, 2–3 pink flowers near roots, no terrain base. |
| bench | Honey wood slats, dark sage curved metal arms and four feet, facing down-left, no plants or terrain. |
| table | Round honey-wood café table, single dark sage pedestal, cream cup, tiny vase with two pastel flowers; no chairs. |
| chair | Honey wood chair, rounded backrest, cream seat pad, four legs; faces down-right, no table/other chairs. |
| lamp | Short dark sage park streetlamp with cream glowing lantern, rounded toy-like proportions, full base to top visible. |
| avatar-peach | One transparent 2×2 directional atlas of the same boy: fluffy brown hair, peach cardigan, cream shirt/shorts, pastel sneakers, no bag, 2.5 heads tall. |
| avatar-lavender | One transparent 2×2 directional atlas of the same girl: brown hair in little high bun, lavender overall shorts, cream shirt, pastel sneakers, 2.5 heads tall. |

For each character atlas: exact equal quadrants, identical scale and foot
baseline; top-left front-left, top-right front-right, bottom-left back-left,
bottom-right back-right. Camera slightly above, neutral idle pose, full body,
70% of cell height, feet at 87% cell height. No lines, arrows, labels or tiles.

Anchors and screen sizes are versioned in `frontend/lib/world/assets.ts`.
Runtime manifest records source hashes, pixel dimensions and derivative sizes.
# Animation follow-up · 2026-10-27

Generated with the built-in `image_gen` tool (transparent_background=true),
using each original idle sheet as identity/style reference. Originals are retained
in `sources/`; no API keys or external stock assets were used.

Walk prompt set (one call for peach, one for lavender): preserve the corresponding
chibi character, face, hairstyle, shoes and clothing; warm pastel 2.5D isometric
view from slightly above. Transparent 4-column × 4-row atlas. Rows are front-left,
front-right, back-left, back-right. Columns are four distinct alternating gait
poses, opposite arms/legs, fixed camera and consistent identity. Equal cells,
common foot baseline at 88%, full body with padding, no labels/background/chairs.
Outputs: `sources/avatar-peach-walk.png`, `sources/avatar-lavender-walk.png`.

Actions prompt set (one call per character): preserve the same identity/style;
transparent landscape 2:1 atlas, four columns × two rows. Columns are front-left,
front-right, back-left, back-right. Top row: seated, knees bent 90 degrees, no chair.
Bottom row: standing and waving with raised hand. Equal cells, shared baseline,
complete silhouette and padding, no labels/background/props.
Outputs: `sources/avatar-peach-actions.png`, `sources/avatar-lavender-actions.png`.

Runtime derivatives are WebP, measured anchors come from the largest opaque
connected silhouette per cell to exclude neighboring-row specks. Source alpha
and original PNGs are preserved. Avatar palette selection is rendered at runtime.
