# Z4theater

Watch films together in private rooms. Z4theater replaced Z4world (a multiplayer plaza);
the last commit with Z4world is `50da2fe`, and `/z4world` links redirect here.

## How it works

- **Catalog** (`/z4theater`): `frontend/lib/theater/movies.ts` reads two sources from the
  browser, with a 5 minute cache and one request per URL. phimapi.com is primary and gives
  direct HLS links. phim.nguonc.com is the backup and gives embeds only.
- **Fallback**: if the primary fails while listing, the catalog moves to the backup, unless
  the viewer chose that source. A stream that fails moves to the same film on the other
  source, matched by title and year. Viewers can also switch by hand.
- **18+ filter**: films labelled 18+, or with no categories, stay hidden on both sources and
  in rooms. phimapi lists carry categories; nguonc needs one lookup per film.
- **Guests**: no account is needed to browse, watch or follow an invite link. A guest who
  picks an episode watches alone at `/z4theater/watch`, a link that holds the film and the
  moment. Logging in, from "Mời bạn" or the chat, returns there and opens a room at that
  moment. In a room guests watch in sync, show up as "Khách" and can read the chat, but
  never chat, open rooms or steer. The seat skips them; if only guests are left, the room
  stops, each can carry on alone, and the next account to join takes the seat.
- **Connection**: rooms use the `/theater` Socket.IO namespace, whose token is optional. The
  main namespace still refuses connections without one, so guests never reach its events.
- **Rooms** (`/z4theater/<id>`, `backend/src/theater/theater.ts`): choosing an episode while
  signed in opens one. They are unlisted, hold 20 people and share only ids and playback state, so nobody
  can push text or a player URL to others.
- **Host**: reports play, pause, seek and a 5 second heartbeat. A host who disconnects pauses
  the room and keeps the seat for 15 seconds, so a reload is safe. Leaving passes it on.
- **Viewers**: `screeningSync.ts` holds them to the host: small drift by speed, more than 3
  seconds by seeking. A viewer who pauses or seeks steps out until they rejoin.
- **Closing**: an empty room closes after 60 seconds.
- **Player**: `HlsPlayer.tsx` uses native HLS on Apple devices, in hardware, and hls.js
  elsewhere. Backup embeds cannot be synced or controlled; they are sandboxed against popups
  and redirects, and need a referrer.

## Constraints

- The backend must run as one instance: rooms are held in memory, and a restart closes them.
- Sources are third parties with no guarantees, and their licensing is unverified.
- The `WorldProfile` table is unused since Z4world was removed. It is still in the schema
  because dropping it deletes data; remove it in its own migration when ready.

## Test

Backend: `npm test`. Frontend unit tests, from `backend/`:
`node --import tsx --test ../frontend/lib/theater/*.test.ts`.

Browser checks need the production frontend on port 3300, pointed at the fixture:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:4400 NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:4400 npm run build -- --webpack
npx next start -p 3300
cd ../backend && JWT_SECRET=z4theater-local-test-only npm run test:theater:fixture
npm run test:theater:browser
```

`backend/tests/theater.browser.cjs` needs Playwright and Chrome. It mocks both sources, with
real video from `backend/tests/fixtures/hls` (a synthetic ffmpeg `testsrc2` pattern). The
fixture uses in-memory users and never connects to a database. The backup's real embed blocks
automated browsers, so its playback still needs a person to check it.
