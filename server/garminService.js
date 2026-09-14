import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { writeTokens, readTokens } from "./garminConfigStore.js";
import { buildTrainingStatusArgs } from "./garminCommands.js";

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

function cleanErrorMessage(rawMessage) {
  if (!rawMessage) return rawMessage;

  if (rawMessage.includes("INVALID_USERNAME_PASSWORD")) {
    return "Usuario o contraseña de Garmin incorrectos.";
  }

  const failedMatch = rawMessage.match(/\[garmin\] FAILED:\s*(.+)/s);
  if (failedMatch) {
    return failedMatch[1].trim();
  }

  return rawMessage;
}

async function runGarminCommand(args = [], env = {}, incomingTokens = null) {
  if (incomingTokens && !(await readTokens())) {
    await writeTokens(incomingTokens);
  }

  return new Promise((resolve, reject) => {
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

        if (error) {
          const errorOutput = [cleanStderr, cleanStdout].filter(Boolean).join("\n");

          if (errorOutput.includes("MFA required")) {
            return resolve({
              ok: false,
              requiresMfa: true,
              message: "Garmin requiere código MFA",
            });
          }

          if (errorOutput.includes("429") || errorOutput.toLowerCase().includes("rate limited")) {
            console.error(`[garmin] rate-limit detected in output: ${errorOutput}`);
            return reject(
              new Error(
                "Garmin bloqueó temporalmente el login por demasiados intentos. Espera unos minutos antes de volver a intentar."
              )
            );
          }

          return reject(
            new Error(cleanErrorMessage(cleanStderr || cleanStdout || error.message))
          );
        }

        const tokens = await readTokens();

        try {
          const data = cleanStdout ? JSON.parse(cleanStdout) : null;

          return resolve({
            ok: true,
            data,
            tokens,
          });
        } catch {
          return resolve({
            ok: true,
            data: cleanStdout,
            tokens,
          });
        }
      }
    );
  });
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
    tokens: result.tokens,
  };
}

export async function loginGarminWithMfa(email, password, mfaCode) {
  const result = await runGarminCommand(["login"], {
    GARMIN_EMAIL: email,
    GARMIN_PASSWORD: password,
    GARMIN_MFA: mfaCode,
  });

  return {
    ok: true,
    authenticated: true,
    message: "Sesión iniciada correctamente",
    tokens: result.tokens,
  };
}

export async function checkSession(incomingTokens) {
  const result = await runGarminCommand(["whoami"], {}, incomingTokens);

  return {
    ok: true,
    authenticated: true,
    user: result.data,
    tokens: result.tokens,
  };
}

export async function getDailySummary(date, incomingTokens) {
  return runGarminCommand(["daily", date, "--pretty"], {}, incomingTokens);
}

export async function getSleepSummary(date, incomingTokens) {
  return runGarminCommand(["sleep", date, "--pretty"], {}, incomingTokens);
}

export async function getWeeklySummary(date, incomingTokens) {
  return runGarminCommand(["weekly", date, "--pretty"], {}, incomingTokens);
}

export async function getActivities({ from, to, limit = 10 }, incomingTokens) {
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

  return runGarminCommand(args, {}, incomingTokens);
}

export async function getHrvSummary(date, incomingTokens) {
  return runGarminCommand(["hrv", date, "--pretty"], {}, incomingTokens);
}

export async function getTrainingReadiness(date, incomingTokens) {
  return runGarminCommand(["readiness", date, "--pretty"], {}, incomingTokens);
}

export async function getTrainingStatus(date, incomingTokens) {
  return runGarminCommand(buildTrainingStatusArgs(date), {}, incomingTokens);
}

export async function getActivityDetail(activityId, incomingTokens) {
  return runGarminCommand(["activity-detail", activityId, "--max-points", "100", "--pretty"], {}, incomingTokens);
}
