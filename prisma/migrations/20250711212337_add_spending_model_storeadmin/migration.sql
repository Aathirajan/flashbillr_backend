-- CreateEnum
CREATE TYPE "SpendingType" AS ENUM ('FOOD', 'TRANSPORT', 'PACKAGING', 'ELECTRICITY', 'SOFTWARE', 'INTERNET', 'SALARY', 'FUEL', 'OTHERS');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "buyPrice" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "spendings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "SpendingType" NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "spendings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "spendings" ADD CONSTRAINT "spendings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
