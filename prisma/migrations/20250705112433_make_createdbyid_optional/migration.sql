-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_createdById_fkey";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
