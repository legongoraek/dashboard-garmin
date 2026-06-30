import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

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

function runGarminCommand(args = [], env = {}) {
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
      (error, stdout, stderr) => {
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

        if (error) {
          return reject(
            new Error(cleanStderr || cleanStdout || error.message)
          );
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
  return runGarminCommand(["daily", date, "--pretty"]);
}

export async function getSleepSummary(date) {
  return runGarminCommand(["sleep", date, "--pretty"]);
}

export async function getWeeklySummary(date) {
  return runGarminCommand(["weekly", date, "--pretty"]);
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

  return runGarminCommand(args);
}

export async function getHrvSummary(date) {
  return runGarminCommand(["hrv", date, "--pretty"]);
}

export async function getTrainingReadiness(date) {
  return runGarminCommand(["readiness", date, "--pretty"]);
}

export async function getTrainingStatus(date) {
  return runGarminCommand(["training-status", date, "--pretty"]);
}