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

export function serverBaseUrl(server) {
  const address = server?.address?.();
  if (!address || typeof address === "string" || !Number.isInteger(address.port)) {
    throw new Error("Runtime server has no assigned TCP port");
  }
  return `http://127.0.0.1:${address.port}`;
}

export async function waitForListening(server) {
  if (server?.listening) return server;
  if (!server || typeof server.once !== "function") {
    throw new Error("Runtime server is not listenable");
  }

  return new Promise((resolve, reject) => {
    const onListening = () => {
      server.off?.("error", onError);
      resolve(server);
    };
    const onError = (error) => {
      server.off?.("listening", onListening);
      reject(error);
    };
    server.once("listening", onListening);
    server.once("error", onError);
  });
}

export async function closeServer(server) {
  if (!server || typeof server.close !== "function" || !server.listening) return;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function runRuntimeSmoke({ startServerFn, smokeFn = runSmoke } = {}) {
  if (typeof startServerFn !== "function") {
    throw new Error("startServerFn is required for runtime smoke verification");
  }

  const server = await startServerFn(0);
  try {
    await waitForListening(server);
    return await smokeFn({ baseUrl: serverBaseUrl(server) });
  } finally {
    await closeServer(server);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  const baseUrlArg = process.argv.find((arg) => arg.startsWith("--base-url="));
  const baseUrl = baseUrlArg ? baseUrlArg.slice("--base-url=".length) : process.env.API_BASE_URL || "http://localhost:4000";
  const result = await runSmoke({ baseUrl });
  if (!result.ok) process.exit(1);
}
