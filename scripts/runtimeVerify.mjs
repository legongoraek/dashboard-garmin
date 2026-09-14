#!/usr/bin/env node
import { runRuntimeSmoke } from "./smoke.mjs";

const { startServer } = await import("../server/index.js");

const result = await runRuntimeSmoke({
  startServerFn: (port) => startServer(port, { logger: { log() {} } }),
});

if (!result.ok) process.exit(1);
console.log("PASS: backend runtime verification completed");
