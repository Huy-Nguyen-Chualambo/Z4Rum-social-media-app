"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Gamepad2,
  LocateFixed,
  Map as MapIcon,
  Maximize,
  MessageCircle,
  Minimize,
  Shirt,
  UserPlus,
} from "lucide-react";
import RequireAuth from "../../_components/RequireAuth";
import WorldScene from "../_components/WorldScene";
import WorldDialog from "../_components/WorldDialog";
import Wardrobe from "../_components/Wardrobe";
import Joystick from "../_components/Joystick";
import GameClubPanel from "../_components/GameClubPanel";
import WorldChat from "../_components/WorldChat";
import RotateHint from "../_components/RotateHint";
import { useWorldClient } from "../_components/useWorldClient";
import {
  COMPACT_QUERY,
  enterImmersive,
  exitImmersive,
  PHONE_QUERY,
  useFullscreen,
  useMediaQuery,
} from "@/lib/world/immersive";
import styles from "../_components/world-hud.module.css";

const EMOTES = ["👋", "❤️", "😂", "🎉"];

export default function WorldPlayPage() {
  const world = useWorldClient();
  const {
    socket,
    players,
    self,
    room,
    status,
    messages,
    game,
    floor,
    scope,
    notice,
    panel,
    now,
    me,
    inLobby,
    participating,
    nearTable,
    open,
  } = world;
  const compact = useMediaQuery(COMPACT_QUERY);
  const phone = useMediaQuery(PHONE_QUERY);
  const fullscreen = useFullscreen();
  const [cameraChoice, setCameraChoice] = useState<boolean | null>(null);
  const follow = cameraChoice ?? compact;
  const [chatChoice, setChatChoice] = useState<boolean | null>(null);
  const chatOpen = chatChoice ?? !compact;
  const [typing, setTyping] = useState(false);
  const composing = compact && chatOpen && typing;
  const [seenMessage, setSeenMessage] = useState("");
  const lastMessage = messages.at(-1);
  const unread =
    !chatOpen &&
    Boolean(lastMessage) &&
    lastMessage?.from !== self &&
    lastMessage?.id !== seenMessage;
  const toggleChat = (value: boolean) => {
    setChatChoice(value);
    if (!value) {
      setTyping(false);
      setSeenMessage(lastMessage?.id ?? "");
    }
  };
  // A compact chat takes the bottom of the screen, like a messaging app.
  const compactChat = compact && chatOpen;
  const movementDisabled = !me || Boolean(panel) || Boolean(me?.table);
  const matchLabel =
    game.phase === "question"
      ? `Câu ${game.question?.number ?? ""}`
      : floor.phase === "running"
        ? `Vòng ${floor.round}`
        : game.phase === "results" || floor.phase === "results"
          ? "Xem kết quả"
          : "Đang chờ người chơi";

  return (
    <div className={`${styles.stage} font-sans`} data-testid="world-stage">
      <RequireAuth />
      <WorldScene
        players={players}
        self={self}
        messages={messages}
        emotes={world.emotes}
        motions={world.motions}
        now={now}
        follow={follow}
        onDestination={world.navigate}
        onInteract={world.interact}
        destination={world.destination}
      />

      {!composing && (
        <header className={styles.top}>
          <div className="flex min-w-0 gap-1.5">
            <Link
              href="/z4world"
              aria-label="Thoát Z4world"
              title="Thoát"
              className={`${styles.glass} ${styles.iconButton}`}
            >
              <ArrowLeft size={18} />
            </Link>
            <div className={`${styles.glass} min-w-0 px-3 py-1`}>
              <h1 className="truncate text-xs font-bold leading-[18px]">
                Quảng trường Bảnh
              </h1>
              <p className="truncate text-[10px] leading-[14px] text-neutral-300">
                {room
                  ? `${Object.keys(players).length}/20 người · Sảnh ${room.split(":")[1]}`
                  : "Đang kết nối"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              disabled={!me}
              aria-label="Tủ đồ"
              title="Tủ đồ"
              className={`${styles.glass} ${styles.iconButton}`}
              onClick={() => open("wardrobe")}
            >
              <Shirt size={18} />
            </button>
            <button
              disabled={!room}
              aria-label="Mời bạn vào sảnh"
              title="Mời bạn vào sảnh"
              className={`${styles.glass} ${styles.iconButton}`}
              onClick={world.invite}
            >
              <UserPlus size={18} />
            </button>
            <button
              aria-label={follow ? "Xem toàn cảnh" : "Theo chân nhân vật"}
              title={follow ? "Xem toàn cảnh" : "Theo chân nhân vật"}
              className={`${styles.glass} ${styles.iconButton}`}
              onClick={() => setCameraChoice(!follow)}
            >
              {follow ? <MapIcon size={18} /> : <LocateFixed size={18} />}
            </button>
            {fullscreen.supported && (
              <button
                aria-label={
                  fullscreen.active ? "Thoát toàn màn hình" : "Toàn màn hình"
                }
                title={
                  fullscreen.active ? "Thoát toàn màn hình" : "Toàn màn hình"
                }
                className={`${styles.glass} ${styles.iconButton}`}
                onClick={() =>
                  fullscreen.active ? exitImmersive() : enterImmersive(phone)
                }
              >
                {fullscreen.active ? (
                  <Minimize size={18} />
                ) : (
                  <Maximize size={18} />
                )}
              </button>
            )}
          </div>
        </header>
      )}

      {!composing && (
        <div className={styles.notices}>
          <RotateHint />
          {status && (
            <div
              role="status"
              className={`${styles.glass} px-3 py-2 text-sm text-amber-200`}
            >
              {status}{" "}
              <button className="underline" onClick={world.retry}>
                Thử lại
              </button>
            </div>
          )}
          {notice && (
            <p
              role="status"
              className={`${styles.glass} break-words px-3 py-2 text-sm text-emerald-200`}
            >
              {notice}{" "}
              <button
                aria-label="Đóng thông báo"
                onClick={() => world.setNotice("")}
              >
                ×
              </button>
            </p>
          )}
        </div>
      )}

      {!compact && (
        <p className={styles.hint}>
          WASD / phím mũi tên hoặc bấm vào đất để đi · E để tương tác
        </p>
      )}

      <div
        className={`${styles.bottomLeft} ${composing ? styles.composing : ""}`}
      >
        <WorldChat
          open={chatOpen}
          composing={composing}
          messages={messages}
          seated={Boolean(me?.table)}
          scope={me?.table ? scope : "nearby"}
          canSend={Boolean(me)}
          onScope={world.setScope}
          onSend={world.sendChat}
          onClose={() => toggleChat(false)}
          onComposing={(value) => {
            setTyping(value);
            if (value) world.stop();
          }}
        />
        {!chatOpen && (
          <button
            aria-label="Mở trò chuyện"
            title="Trò chuyện"
            className={`${styles.glass} ${styles.iconButton} relative`}
            onClick={() => toggleChat(true)}
          >
            <MessageCircle size={18} />
            {unread && <span className={styles.unread} />}
          </button>
        )}
        {compact && !compactChat && (
          <Joystick
            key={`${Boolean(panel)}-${Boolean(me)}`}
            disabled={movementDisabled}
            onChange={world.setTouch}
          />
        )}
      </div>

      {!compactChat && (
        <div className={styles.bottomRight}>
          {(participating || Boolean(floor.pieces[self])) &&
            panel !== "games" && (
              <button
                className={`${styles.action} rounded-xl bg-violet-800 shadow-lg`}
                onClick={() => open("games")}
              >
                Mở lại trận đấu · {matchLabel}
              </button>
            )}
          {me?.table ? (
            <button
              className={`${styles.action} rounded-xl bg-amber-700 shadow-lg`}
              onClick={world.stand}
            >
              Đứng dậy
            </button>
          ) : (
            nearTable && (
              <button
                className={`${styles.action} rounded-xl bg-amber-700 shadow-lg`}
                onClick={() => world.sit(nearTable.id)}
              >
                Ngồi bàn cà phê
              </button>
            )
          )}
          <button
            disabled={!me}
            className={`${styles.action} ${styles.glass} flex items-center gap-1.5 disabled:opacity-45`}
            onClick={() => world.interact("club")}
          >
            <Gamepad2 size={16} aria-hidden />
            {inLobby ? "Vào Game Club" : "Đi tới Game Club"}
          </button>
          <div className="flex gap-1">
            {EMOTES.map((emoji) => (
              <button
                key={emoji}
                aria-label={`Biểu cảm ${emoji}`}
                onClick={() => world.sendEmote(emoji)}
                className={`${styles.glass} ${styles.iconButton} text-lg`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === "wardrobe" && me && (
        <WorldDialog title="Tủ đồ của bạn" onClose={() => open(null)}>
          <Wardrobe
            initial={
              me.appearance ?? {
                character: "peach",
                hair: "original",
                outfit: "original",
              }
            }
            onSaved={world.saveAppearance}
          />
        </WorldDialog>
      )}
      {panel === "games" && (
        <WorldDialog title="Game Club" onClose={() => open(null)}>
          <GameClubPanel
            socket={socket}
            game={game}
            floor={floor}
            players={players}
            self={self}
            now={now}
            inLobby={inLobby}
            participating={participating}
            answered={world.answered}
            floorMember={world.floorMember}
          />
        </WorldDialog>
      )}
    </div>
  );
}
