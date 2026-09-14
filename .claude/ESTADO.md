# Estado del proyecto - dashboard-garmin
_Ultima actualizacion: 2026-09-14_

## Estado general
- Desarrollo actual directo a `main` por instruccion explicita del usuario.
- Spec base: `docs/superpowers/specs/2026-09-13-multisource-analytics-architecture-design.md`.
- Plan Phases 1-3: `docs/superpowers/plans/2026-09-13-canonical-analytics-trends.md`.
- Plan Phases 4-7: `docs/superpowers/plans/2026-09-14-complete-multisource-platform.md`.
- Phases 1-3 fueron integradas a `main` mediante PR #1, merge commit `20a8d6ce91f32af8cb0fbf8bef22008717e2df1a`.

## Implementado

### Canonical + analytics + trends (Phases 1-3)
- Canonical core provider-agnostic para Activity, DailyHealth, Sleep, Recovery, Sample y TrackPoint.
- Garmin normalizer con provenance y preservacion estricta de `null` vs `0`.
- Analytics historico para periodos `7d`, `4w`, `12w`, `6m`, `1y`, semanas locales, rolling averages y errores parciales.
- Recharts provider-agnostic para training/recovery trends.
- Heatmap Garmin existente preservado y separado del track canonico de alta fidelidad.

### Activity Explorer (Phase 4)
- Ruta protegida `/activities/:id` para Garmin.
- Canonical activity-detail con samples + track points.
- Visualizacion de ruta, elevacion, FC, velocidad, cadencia y potencia cuando existen.
- Actividades recientes enlazan al explorer.
- Actividades canonical locales/importadas usan `/imported/:id` con el mismo modelo de visualizacion.

### Persistence foundation (Phase 5)
- IndexedDB local como persistencia canonical cero-infra (`dashboard-garmin-analytics`).
- CRUD local para canonical activity detail.
- Migration `server/migrations/001_analytics_postgis.sql` con PostGIS y entidades:
  - activities
  - activity_sources
  - activity_samples
  - activity_track_points
  - daily_health
  - sleep
  - recovery_metrics
  - raw_objects
  - consents
- Persistencia PostgreSQL server-side NO se marca como activa: falta provisionar DB + instalar runtime adapter `pg`. `DATABASE_URL` solo indica disponibilidad de configuracion, no funcionalidad completa.

### Providers adicionales (Phase 6)
- Registry de providers/capabilities: Garmin legacy, Garmin official, Strava, FIT, GPX y Komoot.
- GPX: import browser-native a canonical con distancia Haversine, elevacion y track points.
- Komoot: soportado mediante export GPX oficial, manteniendo provenance `komoot`.
- Strava:
  - OAuth2 server-side con state CSRF y cookies HttpOnly.
  - token exchange + refresh.
  - API base 2026 `https://api-v3.strava.com`.
  - summaries + streams (`time`, `distance`, `latlng`, `altitude`, `velocity_smooth`, `heartrate`, `cadence`, `watts`, `temp`).
  - sync secuencial de hasta 20 actividades hacia canonical/IndexedDB.
  - desconexion local + intento de revocacion del token remoto.
- FIT:
  - mapping puro de mensajes FIT decodificados a canonical esta implementado.
  - adapter de archivo preparado para `@garmin/fitsdk`.
  - decoding binario NO esta activo en el build actual porque `@garmin/fitsdk` aun no esta instalado/lockeado; la UI/readiness lo reporta como blocker en lugar de fingir soporte completo.
- Pantalla protegida `/sources` para readiness, Strava, GPX/Komoot/FIT e importaciones locales.

### Official Garmin provider (Phase 7)
- Boundary `garmin_official` creado sobre FIT Activity API output hacia el mismo canonical model.
- `/api/providers` reporta approval/configuration readiness.
- Activacion live bloqueada correctamente hasta contar con Garmin Developer Program approval + credentials emitidos por Garmin.
- No se inventaron endpoints/auth privados antes de aprobacion.

### Fixes incluidos
- Falso `429/rate limited` del Garmin runner ya estaba arreglado y commiteado en `8240b72b1e9a08fe8b3bdb7724e2cca0c8b6d7a7`.
- `/api/training-status` ahora usa el subcomando CLI real `training` mediante `server/garminCommands.js`.
- Strava usa el nuevo host 2026 sin duplicar `/api/v3` en el path.

## Configuracion externa pendiente / blockers reales
1. Strava live requiere `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI` y autorizacion OAuth del usuario.
2. Garmin oficial requiere aprobacion del Developer Program y credenciales emitidas por Garmin.
3. PostgreSQL/PostGIS live requiere DB provisionada + `DATABASE_URL` + runtime adapter `pg` (no instalado aun).
4. FIT binary import requiere instalar `@garmin/fitsdk` y actualizar `client/package-lock.json`; mapping/normalizacion ya existe.
5. Year-over-year no se expone aun contra Garmin legacy: el loader actual haria cientos de requests diarios HRV/readiness y eleva innecesariamente el riesgo de rate-limit. Debe apoyarse en historia persistida o providers mas eficientes.
6. Login Garmin puede seguir bloqueado desde IP de Render por reputacion/rate-limit real del datacenter.

## Verificacion
- Se agrego `.github/workflows/ci.yml` para validar en cada push/PR a main:
  - client: `npm ci`, `npm test`, `npm run lint`, `npm run build`
  - server: `npm ci`, `npm test`
- Vercel sigue limitado por build-rate-limit del plan; no usar ese estado como evidencia de fallo de codigo.
- No declarar el rollout totalmente verde hasta observar una corrida CI fresca o ejecutar los comandos localmente.

## Decisiones fijas
- UI/analytics nuevos consumen canonical, nunca payloads provider-specific.
- Missing permanece `null`; no se convierte en cero.
- Requests repetitivas a Garmin y sync Strava se mantienen secuenciales para controlar race/rate-limit.
- IndexedDB es default mientras no haya razon operativa para infraestructura server-side.
- Exact GPS y biometria se consideran datos sensibles y nunca se exponen en landing publica.
- Nunca automatizar ni almacenar credenciales Garmin reales del usuario.
- Nunca usar NTFS junctions para exponer repos git separados dentro de worktrees.
