import { redirect } from "next/navigation";
import WorldLanding from "./_components/WorldLanding";

export default async function WorldPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string | string[] }>;
}) {
  // Invitations shared before the game moved to its own page must keep working.
  const { room } = await searchParams;
  if (typeof room === "string")
    redirect(`/z4world/play?room=${encodeURIComponent(room)}`);
  return <WorldLanding />;
}
