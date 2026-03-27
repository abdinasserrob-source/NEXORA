-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "reportCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportedAt" TIMESTAMP(3);
