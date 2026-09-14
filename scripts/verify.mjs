#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildVerificationSteps } from "./verificationPlan.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const quick = args.has("--quick");
const install = args.has("--install");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const steps = buildVerificationSteps({ rootDir, quick, install });

console.log(`Local verification (${quick ? "quick" : "full"}${install ? ", clean install" : ""})`);

for (const step of steps) {
  console.log(`\n==> ${step.label}`);
  const result = spawnSync(npmCommand, step.args, {
    cwd: step.cwd,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(`Failed to start ${step.label}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nFAILED: ${step.label} (exit ${result.status ?? "unknown"})`);
    process.exit(result.status ?? 1);
  }

  console.log(`PASS: ${step.label}`);
}

console.log("\nPASS: autonomous local verification completed");
