-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person" (
    "id" TEXT NOT NULL,
    "spondGroupId" TEXT NOT NULL,
    "spondMemberId" TEXT NOT NULL,
    "spondProfileId" TEXT,
    "name" TEXT NOT NULL,
    "spondEmail" TEXT,
    "tihldeEmail" TEXT,
    "tihldeUserId" TEXT,
    "tihldeName" TEXT,
    "linkedAt" TIMESTAMP(3),
    "linkedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spond_group_settings" (
    "spondGroupId" TEXT NOT NULL,
    "tihldeGroupSlug" TEXT,
    "fineAmountMatch" INTEGER NOT NULL DEFAULT 2,
    "fineAmountTraining" INTEGER NOT NULL DEFAULT 1,
    "fineAmountOther" INTEGER,
    "fineLawId" TEXT,
    "fineReason" TEXT NOT NULL DEFAULT 'Ikke svart i Spond innen fristen',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "spond_group_settings_pkey" PRIMARY KEY ("spondGroupId")
);

-- CreateTable
CREATE TABLE "event_fine" (
    "id" TEXT NOT NULL,
    "spondGroupId" TEXT NOT NULL,
    "spondEventId" TEXT NOT NULL,
    "spondMemberId" TEXT NOT NULL,
    "tihldeUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "photonFineId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_fine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spond_token" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spond_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "person_spondMemberId_key" ON "person"("spondMemberId");

-- CreateIndex
CREATE INDEX "person_spondGroupId_tihldeUserId_idx" ON "person"("spondGroupId", "tihldeUserId");

-- CreateIndex
CREATE INDEX "person_spondEmail_idx" ON "person"("spondEmail");

-- CreateIndex
CREATE INDEX "person_tihldeEmail_idx" ON "person"("tihldeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "person_spondGroupId_tihldeEmail_key" ON "person"("spondGroupId", "tihldeEmail");

-- CreateIndex
CREATE INDEX "event_fine_spondGroupId_idx" ON "event_fine"("spondGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "event_fine_spondEventId_spondMemberId_key" ON "event_fine"("spondEventId", "spondMemberId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

