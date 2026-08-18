#!/usr/bin/env bash
# Temporary smoke-test helper for the Z4chat wiring. Safe to delete.
set -u

for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  B=$(curl -s -m 3 localhost:4000/healthz 2>/dev/null || true)
  F=$(curl -s -o /dev/null -w '%{http_code}' -m 8 localhost:3000/api/z4chat/models 2>/dev/null || true)
  if [ -n "$B" ] && [ "$F" = "200" ]; then
    echo "BOTH UP after $i tries"
    break
  fi
  sleep 2
done

echo "=== backend /healthz ==="
curl -s -m 5 localhost:4000/healthz || echo "(backend down)"
echo ""
echo "=== backend / ==="
curl -s -m 5 localhost:4000/ || echo "(backend down)"
echo ""
echo "=== GET /api/z4chat/models ==="
curl -s -m 25 localhost:3000/api/z4chat/models || echo "(frontend down)"
echo ""
echo "=== auth guard: GET /z4chat/characters without token (expect 401) ==="
curl -s -o /dev/null -w 'status=%{http_code}\n' -m 5 localhost:4000/z4chat/characters
