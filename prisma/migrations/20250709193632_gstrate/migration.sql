/*
  Warnings:

  - You are about to drop the column `gstAmount` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `gstAmount` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `gstAmount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `gstAmount` on the `pos_receipts` table. All the data in the column will be lost.
  - You are about to drop the column `gstNumber` on the `stores` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "gstAmount";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "gstAmount";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "gstAmount";

-- AlterTable
ALTER TABLE "pos_receipts" DROP COLUMN "gstAmount";

-- AlterTable
ALTER TABLE "stores" DROP COLUMN "gstNumber";
