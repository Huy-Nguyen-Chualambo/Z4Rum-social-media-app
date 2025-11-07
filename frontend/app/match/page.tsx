"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useSocketStore } from "@/lib/store/useSocketStore";
import { useMatchStore } from "@/lib/store/useMatchStore";
import RequireAuth from "../_components/RequireAuth";

export default function MatchPage() {
  const { token, user } = useAuthStore();
  const { socket, connect, disconnect } = useSocketStore();
  const { finding, sessionId, peer, startFinding, setFound, endSession } = useMatchStore();

  useEffect(() => {
    if (token) connect(token);
    return () => disconnect();
  }, [token, connect, disconnect]);

  useEffect(() => {
    if (!socket) return;
    const onFound = (payload: any) => setFound(payload.sessionId, payload.peer);
    const onEnded = () => endSession();
    socket.on("match:found", onFound);
    socket.on("session:ended", onEnded);
    return () => {
      socket.off("match:found", onFound);
      socket.off("session:ended", onEnded);
    };
  }, [socket, setFound, endSession]);

  return (
    <div style={{ maxWidth: 640, margin: "40px auto" }}>
      <RequireAuth />
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Match</h1>
      {!sessionId ? (
        <div>
          <button
            onClick={() => {
              startFinding();
              socket?.emit("match:join", { userId: user?.id });
            }}
            disabled={finding}
            style={{ padding: 10 }}
          >
            {finding ? "Finding someone..." : "Find Match"}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 12 }}>Matched with: {peer?.id}</div>
          <button onClick={() => socket?.emit("session:end", { sessionId, by: user?.id })} style={{ padding: 10 }}>
            End
          </button>
        </div>
      )}
    </div>
  );
}
