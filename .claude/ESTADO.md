# Estado del proyecto - dashboard-garmin
_Ultima actualizacion: 2026-09-14_

## Estado general
- Desarrollo actual directo a `main` por instruccion explicita del usuario.
- Spec base: `docs/superpowers/specs/2026-09-13-multisource-analytics-architecture-design.md`.
- Plan Phases 1-3: `docs/superpowers/plans/2026-09-13-canonical-analytics-trends.md`.
- Plan Phases 4-7: `docs/superpowers/plans/2026-09-14-complete-multisource-platform.md`.
- Phases 1-3 fueron integradas a `main` mediante PR #1, merge commit `20a8d6ce91f32af8cb0fbf8bef22008717e2df1a`.
- Phases 4-7 y extensiones multisource posteriores se implementaron directamente en `main`.

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

### Persistence + multisource archive (Phase 5)
- IndexedDB local como persistencia canonical cero-infra (`dashboard-garmin-analytics`).
- CRUD local para canonical activity detail.
- El loader historico Garmin archiva automaticamente activity summaries canonical en IndexedDB sin romper analytics si el archive local falla.
- Strava, GPX, Komoot y FIT usan el mismo repositorio canonical local.
- Deduplicacion multisource implementada mediante fingerprint de tipo + ventana temporal + duracion + distancia.
- Una actividad logica conserva evidencia de todos sus source records; no se descartan las fuentes duplicadas.
- Prioridad de evidencia para actividad logica: Garmin official, Garmin legacy, FIT, Strava, Komoot, GPX.
- Analitica multisource local muestra registros fuente, actividades logicas, duplicados vinculados y conteo por provider.
- Year-over-year semanal funciona sobre historia canonical persistida sin generar cientos de llamadas HRV/readiness a Garmin.

### Privacidad y portabilidad local
- Backup canonical JSON versionado para datos de IndexedDB.
- Validacion estricta de schema version y `activityUid` antes de restaurar un backup.
- `/sources` permite exportar el archivo canonical local, restaurarlo y borrar todo IndexedDB con confirmacion doble.
- Export/restauracion/borrado se ejecutan en el navegador; el backup no se envia al backend.
- La UI y analytics multisource se refrescan inmediatamente despues de sync/import/restore/delete.

### PostgreSQL + PostGIS runtime
- Migration `server/migrations/001_analytics_postgis.sql` incluye:
  - activities
  - activity_sources
  - activity_samples
  - activity_track_points (geography Point 4326 + GIST)
  - daily_health
  - sleep
  - recovery_metrics
  - raw_objects
  - consents
- Runtime `pg@8.23.0` instalado y lockeado en server.
- `server/postgresRuntime.js` crea Pool lazy solo cuando existe `DATABASE_URL`, con SSL configurable y limites de pool.
- `server/postgresAnalyticsStore.js` persiste activity/source/samples/track points dentro de transaccion y reemplaza children obsoletos en reingesta.
- Los puntos PostGIS usan longitud/latitud en `ST_MakePoint` correctamente.
- `npm run migrate:analytics` aplica la migracion PostGIS de forma transaccional y verifica `postgis_lib_version()` al terminar.
- `/api/providers/postgres/health` verifica conexion/PostGIS bajo demanda y no expone errores internos/credenciales.
- IndexedDB sigue siendo el default; Postgres se activa al configurar/provisionar `DATABASE_URL` y ejecutar la migracion.

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
  - `@garmin/fitsdk@21.214.0` instalado y lockeado en client.
  - decoding binario activo via `Stream.fromArrayBuffer` + `Decoder`.
  - verificacion de formato/integridad antes de normalizar.
  - session/records se convierten a canonical activity/samples/track points manteniendo provenance FIT.
  - CI carga realmente el SDK y verifica que un buffer no-FIT sea rechazado por la ruta binaria.
- Pantalla protegida `/sources` reporta readiness real, importa GPX/Komoot/FIT, sincroniza Strava, muestra analytics multisource/YoY y permite verificar PostGIS cuando esta configurado.

### Official Garmin provider (Phase 7)
- Boundary `garmin_official` creado sobre FIT Activity API output hacia el mismo canonical model.
- `/api/providers` reporta approval/configuration readiness.
- Activacion live bloqueada correctamente hasta contar con Garmin Developer Program approval + credentials emitidos por Garmin.
- No se inventaron endpoints/auth privados antes de aprobacion.

### Fixes incluidos
- Falso `429/rate limited` del Garmin runner arreglado en `8240b72b1e9a08fe8b3bdb7724e2cca0c8b6d7a7`.
- `/api/training-status` usa el subcomando CLI real `training` mediante `server/garminCommands.js`.
- Strava usa el host 2026 sin duplicar `/api/v3` en el path.
- Los efectos React 19 nuevos cumplen `react-hooks/set-state-in-effect`; no se desactivo ESLint.
- Reingesta Postgres elimina samples/track points antiguos antes de insertar el nuevo detalle para evitar datos stale.

## Configuracion externa pendiente / blockers reales
1. Strava live requiere `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI` y autorizacion OAuth del usuario. Todo el flujo de codigo ya existe.
2. Garmin oficial requiere aprobacion del Developer Program y credenciales emitidas por Garmin. El boundary canonical ya existe.
3. PostgreSQL/PostGIS live requiere provisionar una DB, definir `DATABASE_URL` y ejecutar `npm run migrate:analytics`. El runtime `pg`, store, schema, migracion y health check ya existen.
4. Login Garmin legacy puede seguir bloqueado desde IP de Render por reputacion/rate-limit real del datacenter.
5. Smoke tests live de Strava/Garmin official/Postgres requieren sus respectivas credenciales/servicios; no se deben inventar ni almacenar credenciales del usuario.

## Verificacion
- `.github/workflows/ci.yml` valida en cada push/PR a main:
  - client: `npm ci`, `npm test`, `npm run lint`, `npm run build`
  - server: `npm ci`, `npm test`
- La CI detecto y obligo a corregir errores React 19 antes de permitir build verde.
- Multisource dedup + YoY quedo verde en CI run #15 (`9a1e43c615e20160ce06bfcb2e16a31a26656349`).
- FIT SDK se instalo mediante lockfile generado por npm; una corrida temporal verifico `npm ci` antes del commit.
- PostgreSQL runtime `pg` se instalo mediante lockfile generado por npm; una corrida temporal verifico `npm ci` antes del commit.
- CI run #40 (`375c47b2952f33580b9a2b151aa2a6cf7ccfdb78`) termino success con client tests/lint/build y server tests para FIT + Postgres health UI.
- CI run #46 (`9f35a4dca30fc33822d671ac9e7a53a001e833b9`) termino success con client tests/lint/build y server tests para privacidad/portabilidad local.
- CI run #47 (`db4a6ba63df7d9b60bdecdff41e2e69e470537dc`) termino success: client `npm ci`, tests (incluyendo import real del FIT SDK), lint y build; server `npm ci` y tests.
- Vercel puede seguir mostrando failure por build-rate-limit del plan; GitHub Actions es el gate tecnico confiable mientras dure ese limite.

## Decisiones fijas
- UI/analytics nuevos consumen canonical, nunca payloads provider-specific.
- Missing permanece `null`; no se convierte en cero.
- Requests repetitivas a Garmin y sync Strava se mantienen secuenciales para controlar race/rate-limit.
- IndexedDB es default mientras no exista una DB Postgres/PostGIS configurada y migrada.
- YoY usa historia persistida; no se implementa mediante cientos de requests diarios al Garmin legacy.
- Exact GPS, biometria y recovery se consideran datos sensibles y nunca se exponen en landing publica.
- Backups canonical locales se tratan como datos sensibles y solo se exportan por accion explicita del usuario.
- Provider tokens permanecen server-side/HttpOnly cuando aplica.
- Nunca automatizar ni almacenar credenciales Garmin reales del usuario.
- Nunca usar NTFS junctions para exponer repos git separados dentro de worktrees.
