"use server";

import { generateSecret, generateSync, verifySync, generateURI } from "otplib";
import QRCode from "qrcode";
import { hash, compare } from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/authorization";
import { encrypt, decrypt } from "@/lib/encryption";
import { getRedisClient } from "@/lib/rate-limit-redis";

const APP_NAME = "YPP Portal";
const RECOVERY_CODE_COUNT = 8;
const CHALLENGE_TTL_SECONDS = 15 * 60; // 15 minutes

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const hex = crypto.randomBytes(5).toString("hex").toUpperCase();
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
}

function isValidTotp(code: string, secret: string): boolean {
  try {
    const result = verifySync({ token: code, secret });
    return result.valid;
  } catch {
    return false;
  }
}

/** Store a short-lived 2FA challenge token in Redis (or in-memory fallback). */
const inMemoryChallenges = new Map<string, { userId: string; expiresAt: number }>();

async function storeChallengeToken(token: string, userId: string): Promise<void> {
  const client = getRedisClient();
  if (client) {
    await client.set(`2fa:challenge:${token}`, userId, { ex: CHALLENGE_TTL_SECONDS });
    return;
  }
  inMemoryChallenges.set(token, { userId, expiresAt: Date.now() + CHALLENGE_TTL_SECONDS * 1000 });
}

export async function resolveChallengeToken(token: string): Promise<string | null> {
  const client = getRedisClient();
  if (client) {
    const userId = await client.get<string>(`2fa:challenge:${token}`);
    if (userId) {
      await client.del(`2fa:challenge:${token}`); // one-time use
    }
    return userId ?? null;
  }
  const entry = inMemoryChallenges.get(token);
  if (!entry || Date.now() > entry.expiresAt) {
    inMemoryChallenges.delete(token);
    return null;
  }
  inMemoryChallenges.delete(token);
  return entry.userId;
}

// ---------------------------------------------------------------------------
// Public server actions
// ---------------------------------------------------------------------------

/**
 * Generate a new TOTP secret and return the QR code data URL and plain secret.
 * Does NOT save anything to the database yet — the user must confirm with a code first.
 */
export async function setupTwoFactor(): Promise<{ qrCodeUrl: string; secret: string }> {
  const sessionUser = await requireSessionUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { email: true, twoFactorEnabled: true },
  });

  if (!user) throw new Error("User not found");
  if (user.twoFactorEnabled) throw new Error("2FA is already enabled");

  const secret = generateSecret();
  const otpAuthUrl = generateURI({ label: user.email, issuer: APP_NAME, secret });
  const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

  return { qrCodeUrl, secret };
}

/**
 * Enable 2FA after the user verifies their first TOTP code.
 * Saves the encrypted secret and generates recovery codes.
 * Returns recovery codes as plain text for one-time display.
 */
export async function enableTwoFactor(
  secret: string,
  code: string
): Promise<{ recoveryCodes: string[] }> {
  const sessionUser = await requireSessionUser();

  if (!isValidTotp(code, secret)) {
    throw new Error("Invalid verification code. Please try again.");
  }

  const plainCodes = generateRecoveryCodes();
  const hashedCodes = await Promise.all(plainCodes.map((c) => hash(c, 10)));
  const encryptedSecret = encrypt(secret);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: sessionUser.id },
      data: { twoFactorEnabled: true, twoFactorSecret: encryptedSecret },
    }),
    prisma.twoFactorRecovery.deleteMany({ where: { userId: sessionUser.id } }),
    prisma.twoFactorRecovery.createMany({
      data: hashedCodes.map((codeHash) => ({ userId: sessionUser.id, codeHash })),
    }),
  ]);

  return { recoveryCodes: plainCodes };
}

/**
 * Disable 2FA after the user confirms with their current TOTP code.
 */
export async function disableTwoFactor(code: string): Promise<void> {
  const sessionUser = await requireSessionUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  });

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    throw new Error("2FA is not enabled");
  }

  const secret = decrypt(user.twoFactorSecret);
  if (!isValidTotp(code, secret)) {
    throw new Error("Invalid verification code");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: sessionUser.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    }),
    prisma.twoFactorRecovery.deleteMany({ where: { userId: sessionUser.id } }),
  ]);
}

/**
 * Verify a TOTP code or a recovery code for a given userId.
 * Used during the login challenge flow (no session required).
 */
export async function verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorRecovery: {
        where: { usedAt: null },
        select: { id: true, codeHash: true },
      },
    },
  });

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) return false;

  const secret = decrypt(user.twoFactorSecret);
  if (isValidTotp(code, secret)) {
    return true;
  }

  // Check recovery codes
  const normalizedCode = code.trim().toUpperCase();
  for (const recovery of user.twoFactorRecovery) {
    const isMatch = await compare(normalizedCode, recovery.codeHash);
    if (isMatch) {
      await prisma.twoFactorRecovery.update({
        where: { id: recovery.id },
        data: { usedAt: new Date() },
      });
      return true;
    }
  }

  return false;
}

/**
 * Issue a short-lived challenge token after password is verified.
 */
export async function issueTwoFactorChallenge(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await storeChallengeToken(token, userId);
  return token;
}
