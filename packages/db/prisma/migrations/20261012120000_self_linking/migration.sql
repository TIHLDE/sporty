-- CreateTable
CREATE TABLE "person_link_request" (
    "id" TEXT NOT NULL,
    "spondGroupId" TEXT NOT NULL,
    "spondMemberId" TEXT NOT NULL,
    "tihldeUserId" TEXT NOT NULL,
    "tihldeEmail" TEXT,
    "tihldeName" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_link_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link_verification_code" (
    "id" TEXT NOT NULL,
    "spondGroupId" TEXT NOT NULL,
    "spondMemberId" TEXT NOT NULL,
    "tihldeUserId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_verification_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "person_link_request_spondGroupId_idx" ON "person_link_request"("spondGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "person_link_request_spondGroupId_tihldeUserId_key" ON "person_link_request"("spondGroupId", "tihldeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "link_verification_code_spondGroupId_tihldeUserId_key" ON "link_verification_code"("spondGroupId", "tihldeUserId");

