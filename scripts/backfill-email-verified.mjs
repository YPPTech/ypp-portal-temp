/**
 * backfill-email-verified.mjs
 *
 * One-time script: sets emailVerified = now() for credentials users who
 * have a passwordHash but no emailVerified date, so they are not locked out
 * when the emailVerified check is enforced in auth.
 *
 * Run against production before deploying the auth gate:
 *   npm run backfill:email-verified
 *
 * Optional:
 *   npm run backfill:email-verified -- --dry-run
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");

const where = {
  emailVerified: null,
  passwordHash: { not: "" },
};

async function main() {
  const eligible = await prisma.user.count({ where });
  console.log(`Users eligible for emailVerified backfill: ${eligible}`);

  if (isDryRun) {
    console.log("Dry-run mode: no rows were updated.");
    return;
  }

  const result = await prisma.user.updateMany({
    where,
    data: { emailVerified: new Date() },
  });

  console.log(`Users updated: ${result.count}`);

  const remaining = await prisma.user.count({ where });
  console.log(`Users still missing emailVerified after backfill: ${remaining}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
