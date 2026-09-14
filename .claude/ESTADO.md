# Estado del proyecto - dashboard-garmin
_Ultima actualizacion: 2026-09-14 14:00_

## Hecho
- Fases 1-10 del proyecto cerradas por sesiones previas (commits hasta `958f688`). Local estaba 194 commits detras de `origin/main`; sincronizado con `git pull --ff-only`.
- **P-004 (commit `122345d`):** `npm run verify:install` corrido por primera vez en checkout Windows real, PASS end-to-end. Arreglo 2 bugs: `scripts/verify.mjs` spawnSync necesitaba `shell: process.platform === "win32"`; fixtures YoY en `multisourceAnalytics.test.js` necesitaban `sourceActivityId` unico por actividad.
- **`GUIA.md`** creada y enlazada desde `README.md` (commits `b24b999`, `0dedcd1`, `04fd9a4`): activar Strava/Garmin Developer/PostgreSQL, usar el dashboard desplegado, desplegar desde cero, y (seccion 4) receta de 5 min para renovar el login anual de Garmin sin codigo nuevo.
- **P-001 (Strava):** aclarado que la API no requiere suscripcion paga, solo cuenta gratuita (commit `38fd909`). Bloqueo real: falta que el usuario cree la app en strava.com/settings/api.
- **P-002 (Garmin Developer Program):** investigado en vivo — es "for business use", no personal, y las solicitudes parecen pausadas. Prioridad bajada a P3 (commit `58b3fec`).
- **P-006 cerrado:** el bloqueo de IP de Garmin en Render solo afecta el login OAuth1 completo (confirmado en `ai-skill-garmin/.../garmin.ts:29-31,505-507`); el refresco diario usa otro endpoint y dura ~1 ano, asi que produccion funciona normal dia a dia. Usuario rechazo un endpoint admin para automatizar el re-login anual ("tiene que ser facil de usar") — documentada receta manual en `GUIA.md` seccion 4.
- **P-007 cerrado (commits `1eb7138`, `f7874e2`, `c96e92d`):** la landing publica invitaba a cualquier visitante a "Iniciar sesion" cuando el login en produccion esta bloqueado para CUALQUIERA (incluido el autor) por el bloqueo de IP de Render, no por credenciales — y la app es single-tenant (sin `user_id` en Postgres). Se quito el CTA `/login` de los 3 lugares de la landing (navbar, hero, cierre) y se redisenio `LandingPage.jsx` con el skill `frontend-design`: paleta propia "trail log" (ink/panel oscuro, acentos trail-sand `#E8CDA0` y pulse-coral `#FF6B4A`), tipografia Big Shoulders Display + IBM Plex Sans + IBM Plex Mono, grafico SVG de perfil de elevacion como elemento signature. Alcance limitado a `LandingPage.jsx` — theme MUI compartido, favicon y dashboard autenticado sin tocar. `landingStatic.test.js` actualizado. Verificado con `npm run verify` completo (todo verde) y preview local desktop+mobile (screenshots).

## En curso
- Nada a medias. Todo commiteado y pusheado a `origin/main` (ultimo commit `c96e92d`).

## Pendiente
En `PENDIENTES.md` (fuente de verdad compartida entre agentes), en orden de prioridad:
1. **P-001 (P1, BLOQUEADO):** usuario debe crear la app en strava.com/settings/api (gratis) y entregar `STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET`. Pasos en `GUIA.md` seccion 1.1.
2. **P-003 (P1, BLOQUEADO):** provisionar Postgres con PostGIS + `DATABASE_URL`, correr `npm run migrate:analytics` desde `server/`. Pasos en `GUIA.md` seccion 1.3. Sin decision del usuario todavia.
3. **P-005 (P2, PENDIENTE):** smoke live contra providers activados — depende de P-001 o P-003.
4. **P-002 (P3, BLOQUEADO, baja prioridad):** Garmin Developer Program — requiere decision del usuario de si aplica pese a ser "business use" y solicitudes pausadas.

## Decisiones y contexto
- Desarrollo directo a `main`, sin gate de GitHub Actions/CI/CD — instruccion explicita del usuario (`AGENTS.md`/`CLAUDE.md` del repo).
- `PENDIENTES.md` es la fuente de verdad de backlog compartida; `.claude/ESTADO.md` es memoria de sesion, no backlog — no duplicar contenido largo aqui, solo referenciar IDs.
- Strava: NO requiere suscripcion paga para la API — solo cuenta gratuita.
- Garmin Developer Program: programa empresarial, no para hobbyists; parece pausado para nuevas solicitudes.
- `scripts/verify.mjs` debe mantener `shell: process.platform === "win32"` en el `spawnSync` — revertir a `shell: false` rompe en Windows/Node 22.
- Fixtures de test en `multisourceAnalytics.test.js` deben usar `sourceActivityId` unico por actividad simulada.
- **La app es single-tenant de punta a punta** (sin `user_id` en el schema de Postgres, una sola cookie de sesion Garmin, un solo IndexedDB) — no asumir que "activar" un provider habilita multi-usuario.
- El login en produccion (Render) esta bloqueado por reputacion de IP para CUALQUIERA, no por credenciales — ni el propio autor puede loguearse ahi directamente. Por eso la landing publica ya no ofrece ningun CTA de login: solo funciona el flujo de `GUIA.md` seccion 4 (login local + trasplante de cookie).
- El texto de error de login (`server/garminService.js`, cadena "Garmin rechazó este login") es el marcador que `server/index.js` usa para el circuit-breaker de 15 min (`loginBlockedUntil`) — si se cambia el mensaje, actualizar el `.includes(...)` en `index.js` a la vez.
- Se evaluo un endpoint admin para automatizar el trasplante de sesion Garmin y el usuario lo rechazo explicitamente por agregar superficie de ataque sin necesidad para un evento raro (~anual) — preferir siempre la opcion sin codigo nuevo.
- Rediseno de landing (`LandingPage.jsx`) usa paleta/tipografia propias via `sx` locales, NO se toco el `theme` MUI global en `App.jsx` (sigue en azul `#1976d2` para el dashboard autenticado) ni el favicon — si se quiere extender la identidad "trail log" al resto de la app, es una tarea aparte, no implicita.

## Siguiente paso concreto
Esperar a que el usuario traiga las credenciales de Strava (`STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET`) desde strava.com/settings/api. Cuando las traiga: configurarlas en Render segun `GUIA.md` seccion 1.1, correr el flujo OAuth desde `/sources`, y si funciona, mover P-001 a `HECHO` en `PENDIENTES.md` con evidencia (`/api/providers` mostrando `strava.authorized: true`). Si el usuario no trae nada nuevo, no hay trabajo de codigo ejecutable pendiente en este proyecto ahora mismo.
