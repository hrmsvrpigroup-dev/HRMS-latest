-- AlterEnum
ALTER TYPE "TenantStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "registrationDocs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
