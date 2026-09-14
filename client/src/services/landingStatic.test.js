import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const clientRoot = new URL("../../", import.meta.url);

async function readClientFile(path) {
  return readFile(new URL(path, clientRoot), "utf8");
}

test("landing page contains public project, capability, privacy, and CTA content", async () => {
  const landing = await readClientFile("src/pages/LandingPage.jsx");

  assert.match(landing, /Garmin Dashboard/);
  assert.match(landing, /actividad/i);
  assert.match(landing, /salud/i);
  assert.match(landing, /entrenamiento/i);
  assert.match(landing, /rutas/i);
  assert.match(landing, /MFA/);
  assert.match(landing, /React 19/);
  assert.match(landing, /Vite 8/);
  assert.match(landing, /Material UI/);
  assert.match(landing, /Leaflet/);
  assert.match(landing, /no es un producto oficial de Garmin/i);
  assert.match(landing, /to=\{hasSession \? "\/dashboard" : "\/login"\}/);
  assert.match(landing, /github\.com\/legongoraek\/dashboard-garmin/);
});

test("landing page does not import authenticated data services", async () => {
  const landing = await readClientFile("src/pages/LandingPage.jsx");
  assert.doesNotMatch(landing, /garminApi/);
  assert.doesNotMatch(landing, /heatmapData/);
});

test("Vercel rewrites application routes to the Vite entry point", async () => {
  const config = JSON.parse(await readClientFile("vercel.json"));
  assert.deepEqual(config.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);
});
