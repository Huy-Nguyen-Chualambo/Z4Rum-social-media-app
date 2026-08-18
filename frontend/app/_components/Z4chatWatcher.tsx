"use client";
import { useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useZ4chatStore } from "@/lib/store/useZ4chatStore";
import { z4chatApi, z4chatAi } from "@/lib/api/z4chatApi";
import {
  decideNudge,
  markProactiveCheck,
  PROACTIVE_CHECK_INTERVAL_MS,
  shouldRunProactiveCheck,
} from "@/lib/z4chat/proactive";

/**
 * Keeps the Z4chat unread badge current and lets characters message first while
 * the user is anywhere in the app.
 *
 * Renders nothing. Mounted once in the root layout because the whole point of
 * the feature - the character noticing you have been gone - is worthless if it
 * only fires on the page you would have opened anyway.
 *
 * The generation cost is bounded on three sides: the backend only returns
 * sessions already past a coarse silence filter (max 3), the exact time-slot
 * rule runs here against the viewer's clock, and a localStorage timestamp caps
 * the whole sweep at one run per five minutes across tabs and reloads.
 */
export default function Z4chatWatcher() {
  const { token } = useAuthStore();
  const setUnread = useZ4chatStore((state) => state.setUnread);
  const noteProactive = useZ4chatStore((state) => state.noteProactive);
  const hydrateDrafts = useZ4chatStore((state) => state.hydrateDrafts);
  const running = useRef(false);

  useEffect(() => hydrateDrafts(), [hydrateDrafts]);

  const sweep = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    try {
      const unread = await z4chatApi.unread();
      setUnread(unread.total);

      if (!shouldRunProactiveCheck()) return;
      // Stamp before generating: a slow AI call must not let a second tab start
      // the same sweep.
      markProactiveCheck();

      const due = await z4chatApi.proactiveDue();

      for (const session of due) {
        const decision = decideNudge({
          lastSeenAt: session.lastSeenAt,
          lastProactiveAt: session.lastProactiveAt,
          proactive: session.character.proactive,
          clinginess: session.character.clinginess,
        });
        if (!decision.nudge) continue;

        try {
          const { content } = await z4chatAi.proactive({
            character: session.character,
            story: session.story ?? null,
            summary: session.summary ?? null,
            memories: session.memories.filter((memory) => memory.pinned),
            history: session.messages.map((message) => ({ role: message.role, content: message.content })),
            provider: session.provider,
            model: session.model,
            slotPrompt: decision.prompt,
          });

          await z4chatApi.sessions.addProactive(session.id, content);
          noteProactive(session.id);
        } catch {
          // One character failing to reach out should not stop the others.
        }
      }
    } catch {
      // Offline or logged out - the badge simply stays where it was.
    } finally {
      running.current = false;
    }
  }, [noteProactive, setUnread]);

  useEffect(() => {
    if (!token) {
      setUnread(0, []);
      return;
    }

    sweep();
    const timer = setInterval(sweep, PROACTIVE_CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [token, sweep, setUnread]);

  return null;
}
