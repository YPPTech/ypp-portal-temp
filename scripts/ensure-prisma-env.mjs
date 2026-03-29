/**
 * Prisma schema declares `directUrl = env("DIRECT_URL")`. CI/Vercel often only sets
 * DATABASE_URL first. Mirror README: if you are not using a pooler, both may be the same.
 * For PgBouncer / transaction pooler, set DIRECT_URL to a direct Postgres URL (e.g. port 5432).
 */
if (!process.env.DIRECT_URL?.trim() && process.env.DATABASE_URL?.trim()) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  console.warn(
    "[prisma-env] DIRECT_URL was unset; using DATABASE_URL for Prisma CLI. " +
      "If you use a connection pooler, add a separate DIRECT_URL (direct connection) in Vercel env."
  );
}
