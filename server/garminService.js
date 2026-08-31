import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { restoreConfig, persistConfig } from "./garminConfigStore.js";
import { withCache } from "./cache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GARMIN_PROJECT_PATH = path.resolve(
  __dirname,
  "../ai-skill-garmin/skills/garmin-connect"
);

const GARMIN_SCRIPT_PATH = path.resolve(
  GARMIN_PROJECT_PATH,
  "scripts/garmin.ts"
);

const BUN_PATH = process.env.BUN_PATH || process.env.BUN_COMMAND || "bun";

const SHORT_CACHE_TTL_SECONDS = 5 * 60;
const LONG_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

let restorePromise;

function restoreOnce() {
  if (!restorePromise) {
    restorePromise = restoreConfig();
  }
  return restorePromise;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ttlForDate(date) {
  return !date || date === todayStr() ? SHORT_CACHE_TTL_SECONDS : LONG_CACHE_TTL_SECONDS;
}

function runGarminCommand(args = [], env = {}) {
  return restoreOnce().then(
    () =>
      new Promise((resolve, reject) => {
        execFile(
          BUN_PATH,
          ["run", GARMIN_SCRIPT_PATH, ...args],
          {
            cwd: GARMIN_PROJECT_PATH,
            env: {
              ...process.env,
              ...env,
            },
          },
          async (error, stdout, stderr) => {
            const cleanStdout = stdout?.trim();
            const cleanStderr = stderr?.trim();

            const fullOutput = [cleanStdout, cleanStderr]
              .filter(Boolean)
              .join("\n");

            if (fullOutput.includes("MFA required")) {
              return resolve({
                ok: false,
                requiresMfa: true,
                message: "Garmin requiere código MFA",
              });
            }

            if (fullOutput.includes("429") || fullOutput.toLowerCase().includes("rate limited")) {
              return reject(
                new Error(
                  "Garmin bloqueó temporalmente el login por demasiados intentos. Espera unos minutos antes de volver a intentar."
                )
              );
            }

            if (error) {
              return reject(
                new Error(cleanStderr || cleanStdout || error.message)
              );
            }

            try {
              await persistConfig();
            } catch {
              // persistConfig() is designed to never throw, but guard anyway —
              // an unhandled rejection here would leave this Promise unsettled forever.
            }

            try {
              const data = cleanStdout ? JSON.parse(cleanStdout) : null;

              return resolve({
                ok: true,
                data,
              });
            } catch {
              return resolve({
                ok: true,
                data: cleanStdout,
              });
            }
          }
        );
      })
  );
}

export async function loginGarmin(email, password) {
  const result = await runGarminCommand(["login"], {
    GARMIN_EMAIL: email,
    GARMIN_PASSWORD: password,
  });

  if (result.requiresMfa) {
    return result;
  }

  return {
    ok: true,
    authenticated: true,
    message: "Sesión iniciada correctamente",
  };
}

export async function loginGarminWithMfa(email, password, mfaCode) {
  await runGarminCommand(["login"], {
    GARMIN_EMAIL: email,
    GARMIN_PASSWORD: password,
    GARMIN_MFA: mfaCode,
  });

  return {
    ok: true,
    authenticated: true,
    message: "Sesión iniciada correctamente",
  };
}

export async function checkSession() {
  const result = await runGarminCommand(["whoami"]);

  return {
    ok: true,
    authenticated: true,
    user: result.data,
  };
}

export async function getDailySummary(date) {
  return withCache(`daily:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["daily", date, "--pretty"])
  );
}

export async function getSleepSummary(date) {
  return withCache(`sleep:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["sleep", date, "--pretty"])
  );
}

export async function getWeeklySummary(date) {
  return withCache(`weekly:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["weekly", date, "--pretty"])
  );
}

export async function getActivities({ from, to, limit = 10 }) {
  const args = ["activities"];

  if (from) {
    args.push("--from", from);
  }

  if (to) {
    args.push("--to", to);
  }

  if (limit) {
    args.push("--limit", String(limit));
  }

  args.push("--pretty");

  return withCache(`activities:${from ?? ""}:${to ?? ""}:${limit}`, SHORT_CACHE_TTL_SECONDS, () =>
    runGarminCommand(args)
  );
}

export async function getHrvSummary(date) {
  return withCache(`hrv:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["hrv", date, "--pretty"])
  );
}

export async function getTrainingReadiness(date) {
  return withCache(`readiness:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["readiness", date, "--pretty"])
  );
}

export async function getTrainingStatus(date) {
  return withCache(`training-status:${date ?? "latest"}`, ttlForDate(date), () =>
    runGarminCommand(["training-status", date, "--pretty"])
  );
}
