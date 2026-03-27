-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BrowseEventType" ADD VALUE 'WISHLIST_ADD';
ALTER TYPE "BrowseEventType" ADD VALUE 'VENDOR_FOLLOW';
ALTER TYPE "BrowseEventType" ADD VALUE 'PURCHASE_COMPLETE';

-- AlterTable
ALTER TABLE "BrowseEvent" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "vendorId" TEXT;

-- CreateIndex
CREATE INDEX "BrowseEvent_vendorId_idx" ON "BrowseEvent"("vendorId");

-- AddForeignKey
ALTER TABLE "BrowseEvent" ADD CONSTRAINT "BrowseEvent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
