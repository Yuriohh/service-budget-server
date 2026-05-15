-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('draft', 'sent', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "Budget" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Budget" ALTER COLUMN "status" TYPE "BudgetStatus" USING "status"::"BudgetStatus";
ALTER TABLE "Budget" ALTER COLUMN "status" SET DEFAULT 'draft'::"BudgetStatus";
