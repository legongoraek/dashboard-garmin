# Estado del proyecto - dashboard-garmin
_Ultima actualizacion: 2026-09-14 13:15_

## Hecho
- Fases 1-10 del proyecto (canonical model, analytics multisource, providers Garmin/Strava/FIT/GPX/Komoot, persistencia IndexedDB + Postgres/PostGIS preparado, validacion autonoma local, produccion/operabilidad) cerradas por sesiones previas (ver commits hasta `958f688`). Local estaba 194 commits detras de `origin/main`; se hizo `git pull --ff-only` para sincronizar.
- **P-004 cerrado (commit `122345d`):** `npm run verify:install` corrido por primera vez en checkout Windows real, PASS end-to-end. Encontro y arreglo 2 bugs reales: (1) `scripts/verify.mjs` — `spawnSync("npm.cmd", ..., {shell:false})` tiraba `EINVAL` en Node 22/Windows, fix `shell: process.platform === "win32"`; (2) fixtures YoY en `multisourceAnalytics.test.js` compartian `sourceActivityId` default y se fusionaban, fix ID unico por fixture.
- **`GUIA.md` creada y enlazada desde `README.md`** (commits `b24b999`, `0dedcd1`, `04fd9a4`): activar Strava/Garmin Developer/PostgreSQL, usar el dashboard desplegado, desplegar desde cero, y (seccion 4) receta de 5 min para renovar el login anual de Garmin sin codigo nuevo.
- **P-001 (Strava) aclarado:** usuario tiene cuenta gratuita, sin suscripcion paga — confirmado que la API de Strava no requiere plan pago. Bloqueo es solo "falta que el usuario cree la app y entregue credenciales" (commit `38fd909`).
- **P-002 (Garmin Developer Program) investigado en vivo:** es "for business use"/"enterprise use", no personal; solicitudes parecen pausadas (banner "Stay tuned for more updates", sin link de aplicar visible). Prioridad bajada a P3 (commit `58b3fec`) — no perseguir para proyecto personal.
- **P-006 cerrado:** el bloqueo de IP de Garmin en Render investigado a fondo en `ai-skill-garmin/.../garmin.ts:29-31,505-507`. Solo el login OAuth1 completo (con MFA) esta bloqueado; el refresco diario (OAuth2 desde OAuth1 cacheado) usa otro endpoint, no requiere MFA, dura ~1 ano — produccion funciona normal dia a dia, es un evento anual. Usuario rechazo un endpoint admin nuevo para automatizarlo ("tiene que ser facil de usar"). Documentada receta manual de 5 min en `GUIA.md` seccion 4.
- **P-007 cerrado (commit `1eb7138`):** el usuario senalo que la landing publica invitaba a cualquier visitante a "Iniciar sesion" como si su propia cuenta Garmin fuera a funcionar, cuando la app es single-tenant en toda la arquitectura (sin `user_id` en ninguna tabla de Postgres, una sola cookie `garmin_tokens`) y el login en produccion esta bloqueado para cualquiera que no sea el autor (P-006). Arreglado: `LandingPage.jsx` ahora muestra una nota bajo el CTA del hero aclarando que es una sola cuenta, no registro abierto; el mensaje de error de login en `garminService.js`/`index.js` ya no dice "espera unos minutos" (falso para el caso de bloqueo por IP) sino que explica la causa real. Verificado con `npm run verify` (todo verde) y preview local de la landing con screenshot.

## En curso
- Nada a medias. Todo commiteado y pusheado a `origin/main` (ultimo commit `1eb7138`).

## Pendiente
En `PENDIENTES.md` (fuente de verdad compartida entre agentes):
1. **P-001 (P1, BLOQUEADO):** usuario debe crear la app en strava.com/settings/api (gratis) y entregar `STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET`. Pasos en `GUIA.md` seccion 1.1.
2. **P-003 (P1, BLOQUEADO):** provisionar Postgres con PostGIS + `DATABASE_URL`, correr `npm run migrate:analytics` desde `server/`. Pasos en `GUIA.md` seccion 1.3. Sin decision del usuario todavia.
3. **P-002 (P3, BLOQUEADO, baja prioridad):** Garmin Developer Program — requiere decision del usuario de si aplica pese a ser "business use" y solicitudes pausadas.
4. **P-005 (P2, PENDIENTE):** smoke live contra providers activados — depende de P-001 o P-003.

## Decisiones y contexto
- Desarrollo directo a `main`, sin gate de GitHub Actions/CI/CD — instruccion explicita del usuario (`AGENTS.md`/`CLAUDE.md` del repo).
- `PENDIENTES.md` es la fuente de verdad de backlog compartida; `.claude/ESTADO.md` es memoria de sesion, no backlog — no duplicar contenido largo aqui, solo referenciar IDs.
- Strava: NO requiere suscripcion paga para la API — solo cuenta gratuita.
- Garmin Developer Program: programa empresarial, no para hobbyists; parece pausado para nuevas solicitudes.
- `scripts/verify.mjs` debe mantener `shell: process.platform === "win32"` en el `spawnSync` — revertir a `shell: false` rompe en Windows/Node 22.
- Fixtures de test en `multisourceAnalytics.test.js` deben usar `sourceActivityId` unico por actividad simulada.
- **La app es single-tenant de punta a punta** (sin `user_id` en el schema de Postgres, una sola cookie de sesion Garmin, un solo IndexedDB) — no asumir que "activar" un provider habilita multi-usuario; sigue siendo una sola cuenta, la del autor. Si se propone multi-tenancy en el futuro, es un cambio de arquitectura grande, no una activacion.
- El texto de error de login (`server/garminService.js`, cadena "Garmin rechazó este login") es el marcador que `server/index.js` usa para activar el circuit-breaker de 15 min (`loginBlockedUntil`) — si se vuelve a cambiar el mensaje, actualizar el `.includes(...)` en `index.js` a la vez o el circuit-breaker deja de dispararse.
- Se evaluo construir un endpoint admin para automatizar el trasplante de sesion Garmin (P-006) y el usuario lo rechazo explicitamente por agregar superficie de ataque sin necesidad — preferir siempre la opcion sin codigo nuevo cuando el evento es raro (~anual).

## Siguiente paso concreto
Esperar a que el usuario traiga las credenciales de Strava (`STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET`) desde strava.com/settings/api. Cuando las traiga: configurarlas en Render segun `GUIA.md` seccion 1.1, correr el flujo OAuth desde `/sources`, y si funciona, mover P-001 a `HECHO` en `PENDIENTES.md` con evidencia (`/api/providers` mostrando `strava.authorized: true`). Si el usuario no trae nada nuevo, no hay trabajo de codigo ejecutable pendiente en este proyecto ahora mismo.
