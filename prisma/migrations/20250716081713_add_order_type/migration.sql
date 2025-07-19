-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('ONLINE', 'WALKIN');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'ONLINE';
