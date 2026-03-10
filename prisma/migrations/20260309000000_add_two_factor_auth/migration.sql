-- Migration: add_two_factor_auth
-- Adds TOTP-based two-factor authentication fields to User and a new TwoFactorRecovery table.

-- Add 2FA fields to User
ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;

-- New table for single-use recovery codes
CREATE TABLE "TwoFactorRecovery" (
    "id"       TEXT NOT NULL,
    "userId"   TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt"   TIMESTAMP(3),

    CONSTRAINT "TwoFactorRecovery_pkey" PRIMARY KEY ("id")
);

-- Index for fast lookup by user
CREATE INDEX "TwoFactorRecovery_userId_idx" ON "TwoFactorRecovery"("userId");

-- Foreign key: cascades on user delete
ALTER TABLE "TwoFactorRecovery"
    ADD CONSTRAINT "TwoFactorRecovery_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
