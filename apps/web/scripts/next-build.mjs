/**
 * Force NODE_ENV=production for `next build`.
 * Running next build with NODE_ENV=development (common Render misconfig) triggers:
 *   Error: <Html> should not be imported outside of pages/_document
 *   prerendering page "/404"
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const nextPkg = require.resolve("next/package.json");
const nextBin = join(dirname(nextPkg), "dist", "bin", "next");

const env = { ...process.env, NODE_ENV: "production" };
const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env,
  cwd: process.cwd(),
});

process.exit(result.status ?? 1);
