#!/bin/bash
# Script to kill processes on ports 8080, 8081, 8082

for port in 8080 8081 8082; do
  pid=$(sudo lsof -ti :$port 2>/dev/null)
  if [ ! -z "$pid" ]; then
    echo "Killing process on port $port (PID: $pid)..."
    kill -9 $pid 2>/dev/null
    sleep 1
  else
    echo "Port $port is free."
  fi
done
echo "Done. You can now run 'npm run dev'"

