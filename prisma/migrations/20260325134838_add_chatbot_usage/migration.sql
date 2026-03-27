-- CreateTable
CREATE TABLE "ChatbotUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "cooldownUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotUsage_userId_key" ON "ChatbotUsage"("userId");

-- AddForeignKey
ALTER TABLE "ChatbotUsage" ADD CONSTRAINT "ChatbotUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
