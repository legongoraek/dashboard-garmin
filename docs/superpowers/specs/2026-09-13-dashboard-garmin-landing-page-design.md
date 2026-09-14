# Dashboard Garmin Landing Page Design

Date: 2026-09-13
Status: Approved architecture, pending implementation plan

## Objective

Add a public landing page to `dashboard-garmin` so the project has meaningful indexable content for SEO and GEO while preserving the existing Garmin authentication and dashboard behavior.

The public site must explain what the project does, surface the technical work clearly, and avoid presenting the application as an official Garmin product.

## Current state

The client is a React 19 + Vite 8 application using Material UI. `App.jsx` currently decides between `LoginPage` and `DashboardPage` from a localStorage session flag, so the root URL effectively behaves as the login page. The existing SEO/GEO metadata already targets `https://dashboard-garmin-azure.vercel.app/` as the canonical URL.

The repository also contains residual starter CSS from the Vite template. Real product screens use Material UI, so the landing page should follow the MUI design system rather than extend those legacy styles.

## Architecture

Use React Router to split the public and authenticated areas into stable URLs:

- `/` — public landing page.
- `/login` — existing Garmin login flow.
- `/dashboard` — authenticated dashboard.

`BrowserRouter` becomes the top-level client router. Session awareness stays lightweight and compatible with the current localStorage flag.

### Route behavior

- Visiting `/` always shows the public landing page, regardless of authentication state.
- Visiting `/login` while unauthenticated shows the existing login page.
- Successful login stores the existing `garmin_session` flag and navigates to `/dashboard`.
- Visiting `/login` while authenticated redirects to `/dashboard`.
- Visiting `/dashboard` without a session redirects to `/login`.
- Logging out removes the existing session flag and navigates to `/login`.
- Unknown routes redirect to `/`.

This preserves the current session mechanism and does not change the backend API or Garmin authentication behavior.

## Landing page content

The landing page will be a public, responsive MUI page with these sections:

### Header

- Project identity: `Garmin Dashboard`.
- Navigation anchors to the main landing sections.
- Primary CTA: `Iniciar sesión` → `/login`.
- Secondary project link to the GitHub repository.

### Hero

- Clear statement that this is an independent dashboard for visualizing personal Garmin Connect information.
- Short explanation of the project value: activity, health, training, and route data in one interface.
- CTA buttons for login and source code.
- Explicit wording that avoids implying official Garmin affiliation.

### Capabilities

Cards or compact feature blocks covering the existing application scope, including:

- Activity and fitness metrics.
- Health and training information.
- Route and geographic visualization.
- Training heatmap / activity map capabilities where supported by the existing dashboard.
- Garmin login and MFA support.

Only capabilities present in the repository will be described as implemented. No fabricated product metrics, users, integrations, or performance claims will be added.

### Project / technical section

Explain the engineering implementation at a portfolio-friendly level:

- React 19 + Vite 8 frontend.
- Material UI interface.
- Node/Express backend where applicable.
- Garmin Connect data access through the existing backend flow.
- Mapping stack already present in the project (`Leaflet`, `react-leaflet`, `leaflet.heat`).
- Session handling and MFA support.

This section is intended to make the technical work understandable to recruiters, engineers, search engines, and generative engines.

### Privacy and access

State clearly that:

- Personal dashboard information requires authentication.
- The public landing page does not expose private Garmin data.
- Credentials are used only for the existing application login flow.
- The project is independent and is not an official Garmin product.

### Final CTA / footer

- CTA to `/login`.
- GitHub repository link.
- Short independent-project disclaimer.

## Visual design

Use Material UI consistently with the current application theme rather than introducing a second design system.

Visual direction:

- Light-first layout aligned with the current blue/white dashboard palette.
- Strong blue accent from the existing theme (`#1976d2`).
- Clean cards, generous whitespace, restrained gradients, rounded surfaces consistent with the current MUI shape configuration.
- Responsive layouts for mobile, tablet, and desktop.
- No Garmin trademarks or logos will be copied beyond textual references necessary to describe compatibility/context.

Legacy Vite starter CSS in `App.css` and `index.css` may be removed or reduced only where it conflicts with the application. Unrelated styling will not be refactored.

## Components and files

Expected implementation surface:

- `client/package.json` — add `react-router-dom`.
- `client/package-lock.json` — lockfile update.
- `client/src/main.jsx` — mount `BrowserRouter` if routing is owned at the root.
- `client/src/App.jsx` — define route composition and session-aware redirects.
- `client/src/pages/LandingPage.jsx` — new public landing page.
- `client/src/pages/LoginPage.jsx` — preserve existing UI; routing behavior handled by parent/router unless a minimal callback adjustment is needed.
- `client/src/pages/DashboardPage.jsx` — preserve dashboard; logout callback may navigate through the router.
- `client/src/index.css` / `App.css` — remove or neutralize legacy Vite starter rules that conflict with the new layout.
- SEO/GEO files (`index.html`, `robots.txt`, `sitemap.xml`, `llms.txt`) — update only as necessary so the public landing content and route model stay consistent.
- Tests under `client/src/services/**/*.test.js` or another existing testable location.

The implementation should avoid introducing a large component hierarchy unless the landing page becomes difficult to maintain as a single page component. Small presentational arrays/config objects are preferred over unnecessary abstractions.

## SEO and GEO behavior

The canonical root remains:

`https://dashboard-garmin-azure.vercel.app/`

The landing page becomes the primary indexable content at `/`.

SEO/GEO requirements:

- Keep the existing title, description, canonical, robots, Open Graph, Twitter metadata, and JSON-LD unless content needs wording adjustments.
- `sitemap.xml` should include only public/indexable routes. `/login` and `/dashboard` should not be promoted as landing/search destinations.
- `robots.txt` continues to disallow `/api/` and should not encourage indexing of authenticated data.
- `llms.txt` should describe the public project accurately and point to the canonical root.
- Structured data should continue describing the site as an independent `WebApplication`, not an official Garmin product.
- Public landing copy should include enough semantic context for search and generative systems without keyword stuffing.

## Error and edge-case handling

- Route guards must not create redirect loops.
- A stale or missing localStorage session flag must safely resolve to `/login` for `/dashboard`.
- Direct navigation / refresh on `/login` and `/dashboard` must work in Vercel production. If Vercel SPA fallback is not already guaranteed by the current deployment configuration, add the smallest compatible rewrite configuration required for client-side routes.
- Existing backend wake-up behavior should continue for application access without making the public landing dependent on backend availability.
- The landing page must render without any Garmin API request.

## Testing strategy

Use the repository's existing Node `node:test` approach where practical.

Required automated checks:

- Routing/session logic can be tested independently if extracted into a small pure helper; otherwise verify behavior with the lightest practical test approach without adding a large testing framework solely for routing.
- SEO static test continues to verify canonical metadata and public discovery files.
- Add static/structural checks that confirm the landing page exists and contains the required public project/disclaimer content where useful.
- Existing client service tests must remain passing.

Required build checks:

- `npm test` from `client/`.
- `npm run lint` from `client/`.
- `npm run build` from `client/`.

Production verification after deployment:

- `/` returns the landing page and SEO metadata.
- `/login` renders the login page.
- `/dashboard` redirects unauthenticated users to `/login`.
- `robots.txt`, `sitemap.xml`, and `llms.txt` return HTTP 200.
- Vercel production deployment is `READY` for the implementation commit.

## Non-goals

This change will not:

- Redesign the authenticated dashboard.
- Change Garmin API/backend authentication logic.
- Change how Garmin MFA works.
- Add user registration, payments, analytics, or marketing tracking.
- Claim official Garmin affiliation.
- Expose authenticated data publicly.
- Introduce SSR or migrate away from Vite.

## Success criteria

The work is successful when:

1. The canonical root URL presents a complete public landing page without requiring login.
2. Login and dashboard have separate routes with correct session redirects.
3. Existing authenticated functionality remains unchanged.
4. The public page accurately explains the project and its technical scope.
5. SEO/GEO metadata and discovery files remain valid and aligned with the new public landing.
6. The application builds and tests cleanly.
7. The resulting Vercel production deployment is reachable and route behavior is verified.
