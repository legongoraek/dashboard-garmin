# Dashboard Garmin Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an indexable public landing page at `/`, move the existing Garmin authentication to `/login`, protect `/dashboard`, and preserve the current authenticated dashboard behavior.

**Architecture:** Add React Router at the client root and keep session state in the existing `garmin_session` localStorage flag. A small pure session-routing helper will make redirect decisions testable with the existing `node:test` stack; the new landing page will use Material UI and no Garmin API requests. Vercel will receive an SPA rewrite so direct navigation to `/login` and `/dashboard` serves the Vite application.

**Tech Stack:** React 19, Vite 8, Material UI 9, React Router DOM, Node `node:test`, Vercel static deployment.

**Spec:** `docs/superpowers/specs/2026-09-13-dashboard-garmin-landing-page-design.md`

## Global Constraints

- Canonical URL remains `https://dashboard-garmin-azure.vercel.app/`.
- `/` is the primary public/indexable route; `/login` and `/dashboard` are not sitemap destinations.
- Preserve the existing `garmin_session` localStorage session mechanism.
- Do not change Garmin backend authentication, MFA, or API behavior.
- Do not expose private Garmin data on the landing page.
- Describe the project as independent; do not imply official Garmin affiliation.
- Use the existing Material UI blue/white visual language with primary `#1976d2` and border radius `14`.
- The landing page must render without waking or calling the Garmin backend.
- Keep implementation YAGNI: no SSR migration, analytics, registration, payments, or dashboard redesign.

---

## File Structure

- Create `client/src/pages/LandingPage.jsx` — owns all public landing content and MUI presentation.
- Create `client/src/services/sessionRouting.js` — pure session helpers/constants used by `App.jsx` and unit tests.
- Create `client/src/services/sessionRouting.test.js` — tests session reads/writes and route decisions without a browser testing framework.
- Create `client/src/services/landingStatic.test.js` — structural checks for required landing copy, CTAs, and non-affiliation disclaimer.
- Create `client/vercel.json` — SPA rewrite for direct navigation to React Router routes.
- Modify `client/package.json` — add `react-router-dom` dependency.
- Modify `client/package-lock.json` — generated npm lockfile update for `react-router-dom` and transitive dependencies.
- Modify `client/src/main.jsx` — mount `BrowserRouter` around `App`.
- Modify `client/src/App.jsx` — theme, route composition, session-aware guards, backend wake-up only for application routes.
- Modify `client/src/index.css` — replace residual Vite starter global styles with minimal app-safe globals.
- Modify `client/src/services/seoStatic.test.js` — assert public-only sitemap and crawler behavior remain aligned with route model.
- Modify `client/public/robots.txt` — explicitly discourage indexing `/login` and `/dashboard` while retaining `/api/` block.
- Modify `client/public/llms.txt` — describe the public landing and authenticated application boundary.
- Modify `README.md` — document public landing, route model, and SEO/GEO behavior.

---

### Task 1: Add routing dependency and pure session route policy

**Files:**
- Modify: `client/package.json`
- Modify: `client/package-lock.json`
- Create: `client/src/services/sessionRouting.js`
- Create: `client/src/services/sessionRouting.test.js`

**Interfaces:**
- Produces: `SESSION_STORAGE_KEY = "garmin_session"`.
- Produces: `hasStoredSession(storage): boolean` where `storage` implements `getItem(key)`.
- Produces: `storeSession(storage): void` where `storage` implements `setItem(key, value)`.
- Produces: `clearSession(storage): void` where `storage` implements `removeItem(key)`.
- Produces: `resolveProtectedRoute(hasSession): "/dashboard" | "/login"`.
- Produces: `resolveLoginRoute(hasSession): "/dashboard" | "/login"`.

- [ ] **Step 1: Write the failing session-routing test**

Create `client/src/services/sessionRouting.test.js`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SESSION_STORAGE_KEY,
  clearSession,
  hasStoredSession,
  resolveLoginRoute,
  resolveProtectedRoute,
  storeSession,
} from "./sessionRouting.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("session storage helpers preserve the existing garmin_session contract", () => {
  const storage = createStorage();
  assert.equal(hasStoredSession(storage), false);

  storeSession(storage);
  assert.equal(storage.getItem(SESSION_STORAGE_KEY), "true");
  assert.equal(hasStoredSession(storage), true);

  clearSession(storage);
  assert.equal(hasStoredSession(storage), false);
});

test("route policy sends authenticated users to dashboard and guests to login", () => {
  assert.equal(resolveLoginRoute(false), "/login");
  assert.equal(resolveLoginRoute(true), "/dashboard");
  assert.equal(resolveProtectedRoute(false), "/login");
  assert.equal(resolveProtectedRoute(true), "/dashboard");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run from `client/`:

```bash
npm test
```

Expected: FAIL because `src/services/sessionRouting.js` does not exist.

- [ ] **Step 3: Add React Router dependency**

Run from `client/`:

```bash
npm install react-router-dom@^7.9.1
```

Expected: `package.json` and `package-lock.json` both include `react-router-dom`.

- [ ] **Step 4: Implement the minimal pure session helper**

Create `client/src/services/sessionRouting.js`:

```js
export const SESSION_STORAGE_KEY = "garmin_session";

export function hasStoredSession(storage) {
  return storage.getItem(SESSION_STORAGE_KEY) === "true";
}

export function storeSession(storage) {
  storage.setItem(SESSION_STORAGE_KEY, "true");
}

export function clearSession(storage) {
  storage.removeItem(SESSION_STORAGE_KEY);
}

export function resolveLoginRoute(hasSession) {
  return hasSession ? "/dashboard" : "/login";
}

export function resolveProtectedRoute(hasSession) {
  return hasSession ? "/dashboard" : "/login";
}
```

- [ ] **Step 5: Run the tests and verify GREEN**

```bash
npm test
```

Expected: session-routing tests PASS and all pre-existing client tests remain PASS.

- [ ] **Step 6: Commit**

```bash
git add client/package.json client/package-lock.json client/src/services/sessionRouting.js client/src/services/sessionRouting.test.js
git commit -m "feat: add session routing policy"
```

---

### Task 2: Introduce public, login, and protected dashboard routes

**Files:**
- Modify: `client/src/main.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/services/sessionRouting.test.js`

**Interfaces:**
- Consumes: session helper functions from Task 1.
- Consumes: `LandingPage`, created in Task 3; until Task 3 is committed, use a minimal local placeholder component only in the working tree, then replace it before this task is considered complete.
- Produces: route contract `/`, `/login`, `/dashboard`, wildcard → `/`.
- Produces: successful login navigates to `/dashboard`; logout navigates to `/login`.

- [ ] **Step 1: Extend the failing route-policy test for unknown/public route behavior**

Add to `sessionRouting.js` API and its test:

```js
export function normalizePublicPath(pathname) {
  return ["/", "/login", "/dashboard"].includes(pathname) ? pathname : "/";
}
```

Test first:

```js
import { normalizePublicPath } from "./sessionRouting.js";

test("unknown client routes fall back to the public landing", () => {
  assert.equal(normalizePublicPath("/"), "/");
  assert.equal(normalizePublicPath("/login"), "/login");
  assert.equal(normalizePublicPath("/dashboard"), "/dashboard");
  assert.equal(normalizePublicPath("/missing"), "/");
});
```

- [ ] **Step 2: Run test to verify RED**

```bash
npm test
```

Expected: FAIL because `normalizePublicPath` is not exported yet.

- [ ] **Step 3: Implement `normalizePublicPath` and verify GREEN**

Add the function exactly as shown above to `sessionRouting.js`, then run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Mount `BrowserRouter` in `main.jsx`**

Replace `client/src/main.jsx` with:

```jsx
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
```

- [ ] **Step 5: Convert `App.jsx` to route composition and route-aware backend wake-up**

Use this structure:

```jsx
import { useEffect, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import { wakeUpBackend } from "./services/garminApi";
import {
  clearSession,
  hasStoredSession,
  storeSession,
} from "./services/sessionRouting";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    background: { default: "#f5f7fb" },
  },
  shape: { borderRadius: 14 },
});

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasSession, setHasSession] = useState(() => hasStoredSession(localStorage));

  useEffect(() => {
    if (location.pathname === "/login" || location.pathname === "/dashboard") {
      wakeUpBackend().catch((error) => {
        console.warn("No se pudo despertar el backend:", error);
      });
    }
  }, [location.pathname]);

  const handleLoginSuccess = () => {
    storeSession(localStorage);
    setHasSession(true);
    navigate("/dashboard", { replace: true });
  };

  const handleLogout = () => {
    clearSession(localStorage);
    setHasSession(false);
    navigate("/login", { replace: true });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<LandingPage hasSession={hasSession} />} />
        <Route
          path="/login"
          element={
            hasSession ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            hasSession ? (
              <DashboardPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
```

- [ ] **Step 6: Run tests and lint**

```bash
npm test
npm run lint
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add client/src/main.jsx client/src/App.jsx client/src/services/sessionRouting.js client/src/services/sessionRouting.test.js
git commit -m "feat: add public and protected routes"
```

---

### Task 3: Build the public MUI landing page

**Files:**
- Create: `client/src/pages/LandingPage.jsx`
- Create: `client/src/services/landingStatic.test.js`
- Modify: `client/src/index.css`

**Interfaces:**
- Consumes: `hasSession: boolean` prop from `App.jsx`.
- Produces: public navigation to `/login` or `/dashboard` and external source link to `https://github.com/legongoraek/dashboard-garmin`.
- Must not import `garminApi`, `heatmapData`, or any service that performs network access.

- [ ] **Step 1: Write the failing structural landing test**

Create `client/src/services/landingStatic.test.js`:

```js
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
  assert.match(landing, /to="\/login"/);
  assert.match(landing, /github\.com\/legongoraek\/dashboard-garmin/);
});

test("landing page does not import authenticated data services", async () => {
  const landing = await readClientFile("src/pages/LandingPage.jsx");
  assert.doesNotMatch(landing, /garminApi/);
  assert.doesNotMatch(landing, /heatmapData/);
});
```

- [ ] **Step 2: Run test and verify RED**

```bash
npm test
```

Expected: FAIL because `LandingPage.jsx` does not exist.

- [ ] **Step 3: Implement `LandingPage.jsx` with MUI**

Build a single focused component with these exact semantic sections and copy anchors:

```jsx
const capabilities = [
  ["Actividad", "Pasos, calorías, distancia y actividades recientes en una vista centralizada."],
  ["Salud", "Sueño, frecuencia cardiaca, estrés, Body Battery y HRV cuando Garmin Connect dispone de esos datos."],
  ["Entrenamiento", "Readiness, minutos de intensidad y resúmenes semanales para contextualizar la carga de entrenamiento."],
  ["Rutas y mapas", "Visualización geográfica de actividades y heatmaps mediante Leaflet cuando existen coordenadas disponibles."],
];

const stack = ["React 19", "Vite 8", "Material UI", "Leaflet", "Node.js", "Garmin Connect"];
```

The rendered component must contain:

```jsx
<AppBar position="sticky" color="transparent" elevation={0}>...</AppBar>
<Box component="main">
  <Box component="section" id="inicio">...</Box>
  <Box component="section" id="capacidades">...</Box>
  <Box component="section" id="tecnologia">...</Box>
  <Box component="section" id="privacidad">...</Box>
  <Box component="section" id="acceso">...</Box>
</Box>
<Box component="footer">...</Box>
```

Hero copy must include:

```text
Tu información de Garmin Connect, en una vista creada para entenderla mejor.
Dashboard web independiente para explorar actividad, salud, entrenamiento y rutas desde una interfaz clara y centralizada.
```

Primary CTA:

```jsx
<Button component={RouterLink} to={hasSession ? "/dashboard" : "/login"} variant="contained">
  {hasSession ? "Ir al dashboard" : "Iniciar sesión"}
</Button>
```

Source CTA:

```jsx
<Button
  component="a"
  href="https://github.com/legongoraek/dashboard-garmin"
  target="_blank"
  rel="noreferrer"
>
  Ver código fuente
</Button>
```

Privacy section must state:

```text
La landing pública no consulta ni muestra información privada de Garmin. Los datos personales sólo se solicitan dentro del área autenticada.
```

Disclaimer must state exactly:

```text
Proyecto independiente. Garmin Dashboard no es un producto oficial de Garmin ni está presentado como una aplicación respaldada por Garmin.
```

Use MUI `Container`, `Stack`, `Box`, `Card`, `Chip`, `Typography`, `Button`, `AppBar`, and `Toolbar`; use icons already available from `@mui/icons-material`. Do not add a second CSS framework or image dependency.

- [ ] **Step 4: Replace residual global Vite styles with minimal globals**

Replace `client/src/index.css` with:

```css
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

* {
  box-sizing: border-box;
}

a {
  color: inherit;
}
```

Do not import `App.css` unless a component actually needs it; `App.jsx` currently does not import it.

- [ ] **Step 5: Run tests, lint, and build**

```bash
npm test
npm run lint
npm run build
```

Expected: all exit 0 and landing structural tests PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/LandingPage.jsx client/src/services/landingStatic.test.js client/src/index.css
git commit -m "feat: add public Garmin dashboard landing page"
```

---

### Task 4: Make client routes refresh-safe on Vercel

**Files:**
- Create: `client/vercel.json`

**Interfaces:**
- Produces: Vercel rewrite that serves `/index.html` for client-side routes while static files continue to resolve normally.

- [ ] **Step 1: Add a failing static configuration test**

Append to `client/src/services/landingStatic.test.js`:

```js
test("Vercel rewrites application routes to the Vite entry point", async () => {
  const config = JSON.parse(await readClientFile("vercel.json"));
  assert.deepEqual(config.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);
});
```

- [ ] **Step 2: Run test and verify RED**

```bash
npm test
```

Expected: FAIL because `vercel.json` does not exist.

- [ ] **Step 3: Create Vercel rewrite configuration**

Create `client/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 4: Run test and verify GREEN**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/vercel.json client/src/services/landingStatic.test.js
git commit -m "fix: support direct SPA routes on Vercel"
```

---

### Task 5: Align SEO/GEO discovery with the public landing

**Files:**
- Modify: `client/src/services/seoStatic.test.js`
- Modify: `client/public/robots.txt`
- Modify: `client/public/llms.txt`
- Verify: `client/public/sitemap.xml`
- Verify: `client/index.html`

**Interfaces:**
- Consumes: canonical root and route model.
- Produces: crawler guidance that indexes `/` but does not promote authenticated routes.

- [ ] **Step 1: Extend SEO test with public-only route assertions**

Append to `seoStatic.test.js`:

```js
test("search discovery promotes only the public landing", async () => {
  const [robots, sitemap, llms] = await Promise.all([
    readClientFile("public/robots.txt"),
    readClientFile("public/sitemap.xml"),
    readClientFile("public/llms.txt"),
  ]);

  assert.match(robots, /Disallow: \/login/);
  assert.match(robots, /Disallow: \/dashboard/);
  assert.doesNotMatch(sitemap, /<loc>[^<]*\/login<\/loc>/);
  assert.doesNotMatch(sitemap, /<loc>[^<]*\/dashboard<\/loc>/);
  assert.match(llms, /landing pública/i);
  assert.match(llms, /área autenticada/i);
});
```

- [ ] **Step 2: Run test and verify RED**

```bash
npm test
```

Expected: FAIL because current `robots.txt` does not disallow `/login` or `/dashboard` and `llms.txt` does not yet use the required route-boundary wording.

- [ ] **Step 3: Update crawler guidance**

Set `client/public/robots.txt` to:

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /login
Disallow: /dashboard

Sitemap: https://dashboard-garmin-azure.vercel.app/sitemap.xml
```

Keep `sitemap.xml` with only:

```xml
<loc>https://dashboard-garmin-azure.vercel.app/</loc>
```

Update `llms.txt` so its access section includes:

```text
## Public landing and authenticated area

La landing pública en `/` explica el alcance y la arquitectura del proyecto sin consultar información personal. El acceso a datos de Garmin Connect ocurre únicamente dentro del área autenticada en `/dashboard`, después del flujo de `/login`.
```

Keep the existing independent-project clarification.

- [ ] **Step 4: Run tests and verify GREEN**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/public/robots.txt client/public/llms.txt client/src/services/seoStatic.test.js
git commit -m "feat: align SEO discovery with public landing"
```

---

### Task 6: Document routes and run full verification

**Files:**
- Modify: `README.md`
- Verify: all client files changed in Tasks 1–5.

**Interfaces:**
- Produces: developer-facing route/deployment documentation.

- [ ] **Step 1: Update README with public route model**

Add below the SEO/GEO section:

```markdown
## Rutas del frontend

- `/` — landing pública e indexable del proyecto.
- `/login` — acceso con Garmin Connect y MFA cuando es requerido.
- `/dashboard` — dashboard privado; requiere la sesión local existente.

La landing no consulta la API de Garmin. El contenido personal se mantiene dentro del área autenticada. Vercel usa una reescritura SPA para permitir acceso directo y refresh en las rutas del cliente.
```

- [ ] **Step 2: Run fresh full client verification**

From `client/`:

```bash
npm test
npm run lint
npm run build
```

Expected: every command exits 0; Node test runner reports 0 failures; Vite build completes successfully.

- [ ] **Step 3: Inspect the built output**

```bash
test -f dist/index.html
test -f dist/robots.txt
test -f dist/sitemap.xml
test -f dist/llms.txt
grep -F 'rel="canonical" href="https://dashboard-garmin-azure.vercel.app/"' dist/index.html
grep -F 'Disallow: /dashboard' dist/robots.txt
grep -F 'https://dashboard-garmin-azure.vercel.app/' dist/sitemap.xml
```

Expected: every command exits 0.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md
git commit -m "docs: document landing and authenticated routes"
```

- [ ] **Step 5: Merge implementation to `main` only after all checks pass**

Before moving `main`, verify the implementation branch is based on the latest `main` and rerun the full verification if `main` changed during development.

- [ ] **Step 6: Verify Vercel production deployment**

Confirm the deployment for the final implementation commit is `READY`, then request:

```text
https://dashboard-garmin-azure.vercel.app/
https://dashboard-garmin-azure.vercel.app/login
https://dashboard-garmin-azure.vercel.app/dashboard
https://dashboard-garmin-azure.vercel.app/robots.txt
https://dashboard-garmin-azure.vercel.app/sitemap.xml
https://dashboard-garmin-azure.vercel.app/llms.txt
```

Expected:

- `/` returns HTTP 200 and includes the landing shell plus canonical metadata.
- `/login` returns HTTP 200 and client routing renders the login screen.
- `/dashboard` returns HTTP 200 at the HTTP layer; an unauthenticated browser is redirected client-side to `/login`.
- discovery files return HTTP 200 with the committed content.

- [ ] **Step 7: Final route smoke test in a browser**

Use a clean/private browser session:

1. Open `/` and confirm no Garmin API request is required to render the landing.
2. Click `Iniciar sesión` and confirm URL becomes `/login`.
3. Confirm email/password UI and MFA behavior remain available.
4. Open `/dashboard` without `garmin_session=true`; confirm redirect to `/login`.
5. After a valid login, confirm navigation to `/dashboard` and dashboard data loading.
6. Click `Cerrar sesión`; confirm session flag removal and navigation to `/login`.
7. Test mobile width and desktop width; confirm no horizontal overflow and CTA/navigation remain usable.

Expected: all seven checks succeed without redirect loops or authenticated data appearing on `/`.
