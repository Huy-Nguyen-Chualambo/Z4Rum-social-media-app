/** Explicit isolated-DB integration check; never uses the project's DATABASE_URL. */
import assert from "node:assert/strict";
import { PrismaClient, Prisma } from "@prisma/client";
const database = process.env.WORLD_TEST_DATABASE_URL;
if (
  !database?.startsWith(
    "postgresql://postgres:z4world-local-test@127.0.0.1:55432/z4world_test",
  )
)
  throw new Error("Explicit isolated database required");
const prisma = new PrismaClient({ datasourceUrl: database });
async function main() {
  const auth = (await (
    await fetch("http://127.0.0.1:4400/fixture/login/22")
  ).json()) as { token: string };
  const headers = {
    Authorization: `Bearer ${auth.token}`,
    "Content-Type": "application/json",
  };
  const response = await fetch("http://127.0.0.1:4400/world/profile", {
    headers,
  });
  assert.deepEqual(
    await response.json(),
    { character: "lavender", hair: "copper", outfit: "mint" },
    "saved browser appearance survives fixture/server restart",
  );
  const profile = await prisma.worldProfile.findUniqueOrThrow({
    where: { userId: "world-test-22" },
  });
  assert.equal(profile.outfit, "mint");
  assert.ok(profile.updatedAt instanceof Date);
  await assert.rejects(
    () =>
      prisma.$executeRaw`UPDATE "WorldProfile" SET "hair" = 'invalid' WHERE "userId" = 'world-test-22'`,
    (error: unknown) =>
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2010",
  );
  const value = { character: "lavender", hair: "copper", outfit: "mint" };
  let limited = false;
  for (let i = 0; i < 32; i++) {
    const saved = await fetch("http://127.0.0.1:4400/world/profile", {
      method: "PUT",
      headers,
      body: JSON.stringify(value),
    });
    if (saved.status === 429) {
      assert.equal(
        ((await saved.json()) as { code: string }).code,
        "RATE_LIMITED",
      );
      assert.ok(Number(saved.headers.get("Retry-After")) > 0);
      limited = true;
      break;
    }
    assert.equal(saved.status, 200);
  }
  assert.ok(limited, "profile writes are bounded per authenticated account");
  console.log(
    "PASS actual PostgreSQL persistence across server restart, SQL constraint and API write throttling",
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
