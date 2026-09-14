import path from "node:path";

export function buildVerificationSteps({ rootDir, quick = false, install = false } = {}) {
  if (!rootDir) throw new Error("rootDir is required");

  const clientDir = path.join(rootDir, "client");
  const serverDir = path.join(rootDir, "server");
  const steps = [];

  if (install) {
    steps.push(
      { label: "client:install", cwd: clientDir, args: ["ci"] },
      { label: "server:install", cwd: serverDir, args: ["ci"] },
    );
  }

  steps.push({ label: "client:test", cwd: clientDir, args: ["test"] });
  if (!quick) {
    steps.push(
      { label: "client:lint", cwd: clientDir, args: ["run", "lint"] },
      { label: "client:build", cwd: clientDir, args: ["run", "build"] },
    );
  }
  steps.push({ label: "server:test", cwd: serverDir, args: ["test"] });

  return steps;
}
