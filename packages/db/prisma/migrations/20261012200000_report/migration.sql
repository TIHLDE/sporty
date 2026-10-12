-- CreateEnum
CREATE TYPE "report_type" AS ENUM ('bug', 'suggestion');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('open', 'closed', 'rejected');

-- CreateTable
CREATE TABLE "report" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "report_type" NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

