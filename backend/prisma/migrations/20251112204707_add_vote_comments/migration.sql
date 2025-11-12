-- CreateTable
CREATE TABLE "VoteComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VoteComment" ADD CONSTRAINT "VoteComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteComment" ADD CONSTRAINT "VoteComment_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "VoteTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
