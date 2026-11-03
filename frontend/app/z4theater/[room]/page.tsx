"use client";
import { use } from "react";
import TheaterScreen from "../_components/TheaterScreen";
import { useTheaterRoom } from "../_components/useTheaterRoom";

export default function TheaterRoomPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room: roomId } = use(params);
  const room = useTheaterRoom(roomId);
  return (
    <TheaterScreen room={room} loginNext={() => `/z4theater/${roomId}`} />
  );
}
