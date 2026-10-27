CREATE TABLE "WorldProfile" (
    "userId" TEXT NOT NULL,
    "character" TEXT NOT NULL DEFAULT 'peach',
    "hair" TEXT NOT NULL DEFAULT 'original',
    "outfit" TEXT NOT NULL DEFAULT 'original',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorldProfile_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "WorldProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorldProfile_character_check" CHECK ("character" IN ('peach', 'lavender')),
    CONSTRAINT "WorldProfile_hair_check" CHECK ("hair" IN ('original', 'espresso', 'copper')),
    CONSTRAINT "WorldProfile_outfit_check" CHECK ("outfit" IN ('original', 'mint', 'sky', 'rose'))
);
