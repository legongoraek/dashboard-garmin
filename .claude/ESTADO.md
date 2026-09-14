# Estado del proyecto - dashboard-garmin
_Ultima actualizacion: 2026-09-14 12:30_

## Hecho
- Fases 1-10 del proyecto (canonical model, analytics multisource, providers Garmin/Strava/FIT/GPX/Komoot, persistencia IndexedDB + Postgres/PostGIS preparado, validacion autonoma local, produccion/operabilidad) cerradas por sesiones previas (ver commits hasta `958f688`). Local estaba 194 commits detras de `origin/main`; se hizo `git pull --ff-only` para sincronizar.
- **P-004 cerrado (commit `122345d`, pusheado):** `npm run verify:install` corrido por primera vez en checkout Windows real, PASS end-to-end (93 tests: client:install, server:install, root:test, client:test, client:lint, client:build, server:test, root:runtime). Encontro y arreglo 2 bugs reales:
  1. `scripts/verify.mjs` — `spawnSync("npm.cmd", ..., {shell:false})` tiraba `EINVAL` en Node 22/Windows. Fix: `shell: process.platform === "win32"`.
  2. `client/src/domain/analytics/multisourceAnalytics.test.js` (tests YoY) — fixtures de anios distintos compartian `sourceActivityId` default `"1"`, `sameIdentity()` las fusionaba en una sola actividad. Fix: `sourceActivityId` unico por fixture.
- **`GUIA.md` creada y enlazada desde `README.md`** (commits `b24b999`, `0dedcd1`): pasos exactos para activar Strava/Garmin Developer/PostgreSQL (env vars + verificacion), como usar el dashboard ya desplegado, y como desplegar desde cero (Render + Vercel, mismo patron que la instancia real). Deja explicito que Garmin oficial solo tiene la bandera de readiness, sin cliente real implementado todavia.
- **P-001 (Strava) aclarado con el usuario:** confirmo que tiene cuenta Strava gratuita, sin suscripcion paga. Se confirmo que la API de Strava (crear app, `Client ID`/`Secret`) no requiere plan pago, solo cuenta. Bloqueo pasa a ser solo "falta que el usuario cree la app y entregue credenciales" (commit `38fd909`).
- **P-002 (Garmin Developer Program) investigado en vivo** (developer.garmin.com/gc-developer-program, overview + FAQ, 2026-09-14): es explicitamente "for business use"/"enterprise use", no personal; sin costo base pero "algunas metricas pueden requerir license fee o minimo de dispositivos para uso comercial"; no hay boton/link de solicitud visible en la pagina, y el banner "Stay tuned for more updates on the program" sugiere que las solicitudes nuevas estan pausadas. Prioridad bajada a P3 en `PENDIENTES.md` (commit `58b3fec`) — no vale la pena perseguirlo para un proyecto personal por ahora.
- **P-006 cerrado (HECHO):** el bloqueo de IP de Garmin en Render investigado a fondo en el codigo del CLI legacy (`ai-skill-garmin/.../garmin.ts:29-31,505-507`). Solo el login OAuth1 completo (con MFA) esta bloqueado; el refresco diario (OAuth2 desde OAuth1 cacheado) usa otro endpoint, no requiere MFA, dura ~1 ano — por eso produccion funciona normal dia a dia y esto es un evento anual, no diario. Usuario rechazo explicitamente construir un endpoint admin nuevo para automatizarlo ("tiene que ser facil de usar", sin superficie de ataque nueva). Se documento en su lugar una receta de 5 minutos sin codigo nuevo en `GUIA.md` seccion 4 (login local + copiar cookie `garmin_tokens` por DevTools + pegarla en el dominio de Render + `localStorage.garmin_session=true`).

## En curso
- Nada a medias. Todo lo de esta sesion esta commiteado y pusheado a `origin/main` (ultimo commit `58b3fec`).

## Pendiente
En `PENDIENTES.md` (fuente de verdad compartida entre agentes):
1. **P-001 (P1, BLOQUEADO):** usuario debe crear la app en strava.com/settings/api (gratis, ya confirmado que no necesita suscripcion) y entregar `STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET`. Pasos detallados en `GUIA.md` seccion 1.1. Cuando los tenga, configurar en Render, correr flujo OAuth y cerrar P-005 para Strava.
2. **P-003 (P1, BLOQUEADO):** provisionar Postgres con PostGIS + `DATABASE_URL`, correr `npm run migrate:analytics` desde `server/`. Pasos en `GUIA.md` seccion 1.3. Sin decision del usuario de hacerlo todavia.
3. **P-002 (P3, BLOQUEADO, baja prioridad):** Garmin Developer Program — requiere que el usuario decida si aplica pese a ser "business use" y a que las solicitudes parecen pausadas, o que se espere a que el programa reabra. Sin accion mia pendiente hasta que el usuario decida.
4. **P-005 (P2, PENDIENTE):** smoke live contra providers activados — depende de que se resuelva P-001 o P-003 primero.

## Decisiones y contexto
- Desarrollo directo a `main`, sin gate de GitHub Actions/CI/CD — instruccion explicita del usuario, registrada en `AGENTS.md`/`CLAUDE.md` del repo.
- `PENDIENTES.md` es la fuente de verdad de backlog compartida entre Claude, otros agentes y ChatGPT (no duplicar en otro lado); `.claude/ESTADO.md` es memoria de sesion, no backlog.
- Strava: NO requiere suscripcion paga para la API — solo cuenta gratuita. Si se vuelve a preguntar, no asumir que esta bloqueado por dinero.
- Garmin Developer Program: es programa empresarial, no para hobbyists/proyectos personales — bajar expectativas de que se apruebe, y ademas parece pausado para nuevas solicitudes en este momento (banner "Stay tuned for more updates").
- `scripts/verify.mjs` debe mantener `shell: process.platform === "win32"` en el `spawnSync` — si se revierte a `shell: false`, vuelve a romper en Windows/Node 22.
- Fixtures de test en `multisourceAnalytics.test.js` deben usar `sourceActivityId` unico por actividad simulada — compartir el default rompe el dedup en los tests (no en produccion, ahi los IDs reales de Garmin/Strava son unicos).

## Siguiente paso concreto
Esperar a que el usuario traiga las credenciales de Strava (`STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET`) desde strava.com/settings/api. Cuando las traiga: configurarlas en Render segun `GUIA.md` seccion 1.1, correr el flujo OAuth desde `/sources`, y si funciona, mover P-001 a `HECHO` en `PENDIENTES.md` con evidencia (captura o log de `/api/providers` mostrando `strava.authorized: true`). Si el usuario no trae nada nuevo, no hay trabajo de codigo ejecutable pendiente en este proyecto ahora mismo.
