"use client";
import { useEffect, useRef, useState } from "react";
import { syncStep, type SharedPlayback } from "@/lib/theater/screeningSync";

export type PlayerRole = "solo" | "host" | "follower";
type Props = {
  src: string;
  title: string;
  role: PlayerRole;
  shared: SharedPlayback | null;
  startAt: number;
  onReport: (playing: boolean, position: number) => void;
  onProgress: (playing: boolean, position: number) => void;
  onDiverge: () => void;
  onFatal: () => void;
};

const HEARTBEAT_MS = 5_000; // Repairs drift from the host's own buffering.
const REPORT_DELAY_MS = 200; // Dragging the seek bar fires many events in a row.
const TICK_MS = 500;
const USER_SEEK = 3; // hls.js makes tiny jumps over gaps; those are not the viewer.

export default function HlsPlayer(props: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const latest = useRef(props);
  const [blocked, setBlocked] = useState(false);
  const { src, role } = props;
  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let dead = false;
    let destroy = () => {};
    const fail = () => {
      if (!dead) latest.current.onFatal();
    };
    const native = () => {
      element.src = src;
      element.addEventListener("error", fail);
      destroy = () => {
        element.removeEventListener("error", fail);
        element.removeAttribute("src");
        element.load();
      };
    };
    // Apple devices decode HLS in hardware; doing it in JavaScript only adds heat.
    if (
      element.canPlayType("application/vnd.apple.mpegurl") &&
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    ) {
      native();
      return () => {
        dead = true;
        destroy();
      };
    }
    import("hls.js")
      .then(({ default: Hls }) => {
        if (dead) return;
        if (!Hls.isSupported()) return native();
        const hls = new Hls({
          capLevelToPlayerSize: true,
          maxBufferLength: 20,
          backBufferLength: 15,
        });
        let recoveries = 0;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          // hls.js has already retried network errors by the time they are fatal.
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoveries++ < 1)
            return hls.recoverMediaError();
          fail();
        });
        hls.loadSource(src);
        hls.attachMedia(element);
        destroy = () => hls.destroy();
      })
      .catch(native);
    return () => {
      dead = true;
      destroy();
    };
  }, [src]);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let expectSeek = false;
    let expectPause = false;
    let lastTime = 0;
    let lastSeekAt = -Infinity;
    let beats = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const report = () =>
      latest.current.onReport(!element.paused, element.currentTime);
    const reportSoon = () => {
      if (latest.current.role !== "host") return;
      clearTimeout(timer);
      timer = setTimeout(report, REPORT_DELAY_MS);
    };
    const onMetadata = () => {
      const { role: now, startAt } = latest.current;
      if (now === "follower") return;
      if (startAt > 0) {
        expectSeek = true;
        element.currentTime = startAt;
      }
      // Tapping an episode is the gesture that asked for this.
      element.play().catch(() => {});
    };
    const onPause = () => {
      reportSoon();
      if (expectPause) expectPause = false;
      else if (
        latest.current.role === "follower" &&
        latest.current.shared?.playing &&
        !element.ended
      )
        latest.current.onDiverge();
    };
    const onSeeking = () => {
      if (expectSeek) expectSeek = false;
      else if (
        latest.current.role === "follower" &&
        Math.abs(element.currentTime - lastTime) > USER_SEEK
      )
        latest.current.onDiverge();
    };
    const onTime = () => {
      lastTime = element.currentTime;
      latest.current.onProgress(!element.paused, element.currentTime);
    };
    const tick = setInterval(() => {
      const { role: now, shared } = latest.current;
      if (now === "host") {
        beats += TICK_MS;
        if (beats >= HEARTBEAT_MS) {
          beats = 0;
          if (!element.paused) report();
        }
      }
      if (now !== "follower" || !shared) {
        if (element.playbackRate !== 1) element.playbackRate = 1;
        return;
      }
      if (element.readyState < 1) return;
      const time = Date.now();
      const step = syncStep({
        current: element.currentTime,
        paused: element.paused,
        duration: element.duration,
        shared,
        now: time,
        lastSeekAt,
      });
      element.playbackRate = step.rate;
      if (step.seekTo !== null) {
        expectSeek = true;
        lastSeekAt = time;
        element.currentTime = step.seekTo;
      }
      if (step.play === true)
        element.play().catch((reason: Error) => {
          if (reason.name === "NotAllowedError") setBlocked(true);
        });
      if (step.play === false) {
        expectPause = true;
        element.pause();
      }
    }, TICK_MS);
    element.addEventListener("loadedmetadata", onMetadata);
    element.addEventListener("play", reportSoon);
    element.addEventListener("pause", onPause);
    element.addEventListener("seeking", onSeeking);
    element.addEventListener("seeked", reportSoon);
    element.addEventListener("timeupdate", onTime);
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
      element.removeEventListener("loadedmetadata", onMetadata);
      element.removeEventListener("play", reportSoon);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("seeking", onSeeking);
      element.removeEventListener("seeked", reportSoon);
      element.removeEventListener("timeupdate", onTime);
      // The host left the player: the room should not run on without a picture.
      if (latest.current.role === "host")
        latest.current.onReport(false, element.currentTime);
    };
  }, []);

  // Becoming host fixes the shared position straight away. Before the video has
  // loaded its position means nothing, and reporting it would rewind the room.
  useEffect(() => {
    if (role !== "host" || !video.current || video.current.readyState < 1)
      return;
    latest.current.onReport(!video.current.paused, video.current.currentTime);
  }, [role]);

  return (
    <div className="relative">
      <video
        ref={video}
        title={props.title}
        controls
        playsInline
        className="aspect-video max-h-[72dvh] w-full rounded-sm bg-black"
      />
      {blocked && (
        <button
          className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/70 text-sm font-semibold text-white"
          onClick={() => {
            setBlocked(false);
            video.current?.play().catch(() => {});
          }}
        >
          Bấm để xem cùng cả phòng
        </button>
      )}
    </div>
  );
}
