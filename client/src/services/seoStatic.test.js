import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { test } from "node:test";

const clientRoot = new URL("../../", import.meta.url);

async function readClientFile(path) {
  return readFile(new URL(path, clientRoot), "utf8");
}

test("the public document exposes core SEO and social metadata", async () => {
  const html = await readClientFile("index.html");

  assert.match(html, /<html lang="es">/);
  assert.match(html, /name="description"/);
  assert.match(
    html,
    /rel="canonical" href="https:\/\/dashboard-garmin-azure\.vercel\.app\/"/,
  );
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card" content="summary"/);
  assert.match(html, /type="application\/ld\+json"/);
  assert.match(html, /"@type": "WebApplication"/);
});

test("crawler and generative-engine discovery files point at the canonical site", async () => {
  const [robots, sitemap, llms] = await Promise.all([
    readClientFile("public/robots.txt"),
    readClientFile("public/sitemap.xml"),
    readClientFile("public/llms.txt"),
  ]);

  assert.match(
    robots,
    /Sitemap: https:\/\/dashboard-garmin-azure\.vercel\.app\/sitemap\.xml/,
  );
  assert.match(sitemap, /<loc>https:\/\/dashboard-garmin-azure\.vercel\.app\/<\/loc>/);
  assert.match(llms, /Canonical URL: https:\/\/dashboard-garmin-azure\.vercel\.app\//);
  assert.match(llms, /dashboard independiente/i);
});
