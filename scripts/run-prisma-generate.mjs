import "./ensure-prisma-env.mjs";
import { spawnSync } from "node:child_process";

const result = spawnSync("npx prisma generate", {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
process.exit(result.status ?? 1);
