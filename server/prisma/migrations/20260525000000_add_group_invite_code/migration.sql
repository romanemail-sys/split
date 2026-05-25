-- AlterTable: add inviteCode with a default of gen_random_uuid() so existing rows get a value
ALTER TABLE "Group" ADD COLUMN "inviteCode" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- Make the default dynamic only during migration, then remove it
-- (Prisma will manage it via @default(uuid()) in schema)
ALTER TABLE "Group" ALTER COLUMN "inviteCode" DROP DEFAULT;

-- Add unique constraint
CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");
