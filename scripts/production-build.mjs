import "./ensure-prisma-env.mjs";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function runCmdLine(commandLine) {
  const result = spawnSync(commandLine, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runCmdLine("node scripts/maybe-db-sync.mjs");

for (const rel of [".next", path.join("node_modules", ".prisma")]) {
  try {
    fs.rmSync(rel, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

runCmdLine("npx prisma generate");
runCmdLine("npx next build");
