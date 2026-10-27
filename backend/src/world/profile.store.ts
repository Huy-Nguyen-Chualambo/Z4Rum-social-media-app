import type { PrismaClient } from "@prisma/client";
import { parseAppearance, type Appearance } from "./appearance";
export type ProfileStore = {
  read: (userId: string) => Promise<Appearance | null>;
  save: (userId: string, value: Appearance) => Promise<Appearance>;
};
export function prismaProfileStore(prisma: PrismaClient): ProfileStore {
  return {
    read: async (userId) => {
      const row = await prisma.worldProfile.findUnique({ where: { userId } });
      return row
        ? parseAppearance({
            character: row.character,
            hair: row.hair,
            outfit: row.outfit,
          })
        : null;
    },
    save: async (userId, value) => {
      const row = await prisma.worldProfile.upsert({
        where: { userId },
        create: { userId, ...value },
        update: value,
      });
      return parseAppearance({
        character: row.character,
        hair: row.hair,
        outfit: row.outfit,
      })!;
    },
  };
}
