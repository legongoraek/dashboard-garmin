import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { test } from "node:test";

const clientRoot = new URL("../../", import.meta.url);

test("the browser uses the Garmin activity favicon", async () => {
  const [favicon, index] = await Promise.all([
    readFile(new URL("public/favicon.svg", clientRoot), "utf8"),
    readFile(new URL("index.html", clientRoot), "utf8"),
  ]);

  assert.match(
    index,
    /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg" \/>/,
  );
  assert.match(favicon, /viewBox="0 0 64 64"/);
  assert.match(favicon, /<title\b[^>]*>Garmin activity dashboard<\/title>/);
  assert.match(favicon, /fill="#1976d2"/);
  assert.match(favicon, /stroke="#ffffff"/);
  assert.doesNotMatch(favicon, /<filter\b/);
});
