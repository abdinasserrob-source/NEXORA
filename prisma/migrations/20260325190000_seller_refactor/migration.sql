-- CreateEnum
CREATE TYPE "SellerOperationalStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BLOCKED');

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "shopEmail" TEXT,
ADD COLUMN     "shopPhone" TEXT,
ADD COLUMN     "shopAddress" TEXT,
ADD COLUMN     "shippingPolicy" TEXT,
ADD COLUMN     "returnPolicy" TEXT,
ADD COLUMN     "operationalStatus" "SellerOperationalStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "approvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SellerApplication" ADD COLUMN     "shopEmail" TEXT,
ADD COLUMN     "shopPhone" TEXT,
ADD COLUMN     "shopAddress" TEXT,
ADD COLUMN     "documentNote" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "tags" TEXT,
ADD COLUMN     "attributes" TEXT,
ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "sellerReply" TEXT,
ADD COLUMN     "sellerRepliedAt" TIMESTAMP(3);
