// Postbuild: give crawlers that do not run JavaScript (GPTBot, ClaudeBot, PerplexityBot)
// a visible h1, summary, features and FAQ built from the page's own <head> metadata and JSON-LD.
// The app replaces the root container's children on mount, so users with JS see no change.
// Usage: node scripts/static-shell.mjs <built index.html>
import { readFileSync, writeFileSync } from "node:fs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const decode = (s) => s.replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function nodes(value, out = []) {
  if (Array.isArray(value)) value.forEach((v) => nodes(v, out));
  else if (value && typeof value === "object") {
    out.push(value);
    Object.values(value).forEach((v) => nodes(v, out));
  }
  return out;
}

export function injectShell(html) {
  const title = decode(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "").trim();
  const description = decode(html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? "").trim();
  if (!title || !description) throw new Error("static-shell: <title> and meta description are required");
  if (!/<meta\s+property="og:image"\s+content="https:\/\/[^"]+"/i.test(html)) throw new Error("static-shell: absolute og:image is required");
  const ld = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].flatMap((m) => nodes(JSON.parse(m[1])));
  const questions = ld.filter((n) => n["@type"] === "Question" && n.acceptedAnswer?.text);
  const features = [...new Set(ld.flatMap((n) => (Array.isArray(n.featureList) ? n.featureList : [])))];
  const h1 = title.split(/\s+[|–—-]\s+/)[0];
  const place = ld.find((n) => n.name && n.address?.streetAddress);
  let body = `<h1>${esc(h1)}</h1><p>${esc(description)}</p>`;
  if (place) {
    const a = place.address;
    const where = [a.streetAddress, a.addressLocality, a.addressRegion].filter(Boolean).join(", ");
    body += `<p>${esc(place.name)}: ${esc(where)}${place.telephone ? `. Tel. ${esc(place.telephone)}` : ""}</p>`;
  }
  if (features.length) body += `<ul>${features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`;
  if (questions.length) {
    body += `<section><h2>Preguntas frecuentes</h2>${questions.map((q) => `<h3>${esc(q.name)}</h3><p>${esc(q.acceptedAnswer.text)}</p>`).join("")}</section>`;
  }
  const shell = `<main data-static-shell>${body}</main>`;
  const root = /(<div id="root">)\s*(<\/div>)|(<app-root[^>]*>)\s*(<\/app-root>)/i;
  if (!root.test(html)) throw new Error("static-shell: empty #root or <app-root> not found");
  const out = html.replace(root, (m, a, b, c, d) => (a ? a + shell + b : c + shell + d));
  // Self-check: exactly one h1 and every FAQ answer visible.
  if ((out.match(/<h1>/g) ?? []).length !== 1) throw new Error("static-shell: expected one h1");
  for (const q of questions) if (!out.includes(esc(q.acceptedAnswer.text))) throw new Error(`static-shell: FAQ answer missing: ${q.name}`);
  return out;
}

const file = process.argv[2];
if (file) {
  writeFileSync(file, injectShell(readFileSync(file, "utf8")));
  console.log(`static-shell: injected crawler content into ${file}`);
}
