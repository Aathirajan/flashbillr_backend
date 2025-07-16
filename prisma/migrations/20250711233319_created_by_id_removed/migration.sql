-- DropForeignKey
ALTER TABLE "stores" DROP CONSTRAINT "stores_createdById_fkey";

-- AlterTable
ALTER TABLE "stores" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
