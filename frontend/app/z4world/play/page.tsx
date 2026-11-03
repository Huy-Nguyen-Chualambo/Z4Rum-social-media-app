"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LocateFixed,
  Map as MapIcon,
  Maximize,
  MessageCircle,
  Minimize,
  Shirt,
  Smile,
  UserPlus,
} from "lucide-react";
import RequireAuth from "../../_components/RequireAuth";
import WorldScene, { type SceneAction } from "../_components/WorldScene";
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
  const [emotesOpen, setEmotesOpen] = useState(false);
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
  const playerCount = Object.keys(players).length;
  const action: SceneAction | null = !me
    ? null
    : me.table
      ? { label: "Đứng dậy", run: world.stand }
      : nearTable
        ? {
            label: "Ngồi bàn cà phê",
            run: () => world.sit(nearTable.id),
          }
        : inLobby
          ? {
              label: "Vào Game Club",
              run: () => world.interact("club"),
            }
          : null;
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
        action={panel ? null : action}
        showKeyHint={!compact}
      />

      {!composing && (
        <header className={styles.top}>
          <div className="flex min-w-0 gap-1.5">
            <Link
              href="/z4world"
              aria-label="Thoát Z4world"
              title="Thoát"
              className={`${styles.panel} ${styles.iconButton}`}
            >
              <ArrowLeft size={18} />
            </Link>
            <div className={`${styles.panel} min-w-0 px-3 py-1`}>
              <h1 className="truncate text-xs font-bold leading-[18px]">
                Z4world
              </h1>
              <p className="truncate text-[10px] leading-[14px] text-[#969696]">
                {room ? `${playerCount}/20 người trong sảnh` : "Đang kết nối"}
              </p>
            </div>
          </div>
          {fullscreen.supported && (
            <button
              aria-label={
                fullscreen.active ? "Thoát toàn màn hình" : "Toàn màn hình"
              }
              title={
                fullscreen.active ? "Thoát toàn màn hình" : "Toàn màn hình"
              }
              className={`${styles.panel} ${styles.iconButton}`}
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
        </header>
      )}

      {!composing && (
        <div className={styles.notices}>
          <RotateHint />
          {status && (
            <div
              role="status"
              className={`${styles.panel} px-3 py-2 text-sm text-[#dedede]`}
            >
              {status}{" "}
              <button
                className="font-semibold text-blue-400 underline"
                onClick={world.retry}
              >
                Thử lại
              </button>
            </div>
          )}
          {notice && (
            <p
              role="status"
              className={`${styles.panel} break-words px-3 py-2 text-sm text-[#dedede]`}
            >
              {notice}{" "}
              <button
                aria-label="Đóng thông báo"
                className="px-1 text-[#969696]"
                onClick={() => world.setNotice("")}
              >
                ×
              </button>
            </p>
          )}
        </div>
      )}

      {me && !world.hasWalked && !compactChat && !panel && (
        <p className={styles.hint}>
          {compact
            ? "Kéo joystick hoặc chạm đất để đi. Chạm vào quán để ghé."
            : "WASD hoặc bấm vào đất để đi. Bấm vào quán để ghé."}
        </p>
      )}

      <div
        className={`${styles.bottomLeft} ${composing ? styles.composing : ""} ${compactChat ? styles.chatFull : ""}`}
      >
        <WorldChat
          open={chatOpen}
          composing={composing}
          messages={messages}
          seated={Boolean(me?.table)}
          scope={me?.table ? scope : "nearby"}
          alone={playerCount <= 1}
          canSend={Boolean(me)}
          onScope={world.setScope}
          onSend={world.sendChat}
          onClose={() => toggleChat(false)}
          onComposing={(value) => {
            setTyping(value);
            if (value) world.stop();
          }}
        />
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
                className={styles.matchButton}
                onClick={() => open("games")}
              >
                Mở lại trận đấu · {matchLabel}
              </button>
            )}
          {emotesOpen && (
            <div className={`${styles.panel} ${styles.emotes}`}>
              {EMOTES.map((emoji) => (
                <button
                  key={emoji}
                  aria-label={`Biểu cảm ${emoji}`}
                  onClick={() => {
                    world.sendEmote(emoji);
                    setEmotesOpen(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <nav
            aria-label="Công cụ Z4world"
            className={`${styles.panel} ${styles.dock}`}
          >
            <button
              aria-label={chatOpen ? "Đóng trò chuyện" : "Mở trò chuyện"}
              aria-pressed={chatOpen}
              className={`${styles.dockItem} ${chatOpen ? styles.dockItemActive : ""}`}
              onClick={() => toggleChat(!chatOpen)}
            >
              <MessageCircle size={20} />
              <span>Chat</span>
              {unread && <span className={styles.unread} />}
            </button>
            <button
              aria-label="Biểu cảm"
              aria-expanded={emotesOpen}
              disabled={!me}
              className={`${styles.dockItem} ${emotesOpen ? styles.dockItemActive : ""}`}
              onClick={() => setEmotesOpen(!emotesOpen)}
            >
              <Smile size={20} />
              <span>Biểu cảm</span>
            </button>
            <button
              aria-label="Tủ đồ"
              disabled={!me}
              className={styles.dockItem}
              onClick={() => open("wardrobe")}
            >
              <Shirt size={20} />
              <span>Tủ đồ</span>
            </button>
            <button
              aria-label="Mời bạn vào sảnh"
              disabled={!room}
              className={styles.dockItem}
              onClick={world.invite}
            >
              <UserPlus size={20} />
              <span>Mời bạn</span>
            </button>
            <button
              aria-label={follow ? "Xem toàn cảnh" : "Theo chân nhân vật"}
              className={styles.dockItem}
              onClick={() => setCameraChoice(!follow)}
            >
              {follow ? <MapIcon size={20} /> : <LocateFixed size={20} />}
              <span>{follow ? "Toàn cảnh" : "Theo chân"}</span>
            </button>
          </nav>
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
