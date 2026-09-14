#!/usr/bin/env node
import { pathToFileURL } from "node:url";

export function buildSmokeTargets(baseUrl = "http://localhost:4000") {
  const normalized = baseUrl.replace(/\/$/, "");
  return [
    `${normalized}/api/health`,
    `${normalized}/api/providers`,
  ];
}

export async function checkEndpoint(url, fetchFn = fetch) {
  try {
    const response = await fetchFn(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = response.headers?.get?.("content-type") ?? "";
    let body = null;
    if (contentType.includes("application/json")) {
      try {
        body = await response.json();
      } catch {
        body = null;
      }
    }
    return { url, ok: response.ok, status: response.status, body };
  } catch (error) {
    return { url, ok: false, status: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function runSmoke({ baseUrl = "http://localhost:4000", fetchFn = fetch } = {}) {
  const results = [];
  for (const url of buildSmokeTargets(baseUrl)) {
    const result = await checkEndpoint(url, fetchFn);
    results.push(result);
    console.log(`${result.ok ? "PASS" : "FAIL"}: ${url}${result.status ? ` (${result.status})` : ""}`);
    if (result.error) console.error(`  ${result.error}`);
  }
  return { ok: results.every((result) => result.ok), results };
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  const baseUrlArg = process.argv.find((arg) => arg.startsWith("--base-url="));
  const baseUrl = baseUrlArg ? baseUrlArg.slice("--base-url=".length) : process.env.API_BASE_URL || "http://localhost:4000";
  const result = await runSmoke({ baseUrl });
  if (!result.ok) process.exit(1);
}
