# Estado del proyecto - dashboard-garmin
_Ultima actualizacion: 2026-09-13_

## En curso
- Rama activa: `feature/canonical-analytics-trends`.
- Spec aprobada: `docs/superpowers/specs/2026-09-13-multisource-analytics-architecture-design.md`.
- Plan: `docs/superpowers/plans/2026-09-13-canonical-analytics-trends.md`.
- Alcance actual: Phases 1-3 de la arquitectura aprobada — canonical core, Garmin normalizer, analytics historico y visualizacion Recharts.

## Implementado en la rama
- Canonical core en `client/src/domain/analytics/` para Activity, DailyHealth, Sleep y Recovery.
- Normalizador Garmin desacoplado del UI con preservacion estricta de `null` vs `0`, provenance `source/sourceActivityId` y `activityUid` estable cuando Garmin entrega ID.
- Analytics puro para:
  - semanas basadas en lunes,
  - distancia/duracion/actividades/desnivel,
  - recovery series,
  - rolling averages,
  - periodos `7d`, `4w`, `12w`, `6m`, `1y`.
- Periodos de calendario 6m/1y clamped al ultimo dia valido del mes destino (ej. 31 agosto - 6m = 28 febrero; 29 febrero - 1y = 28 febrero cuando aplica).
- Loader historico `client/src/services/trendsData.js` usando APIs Garmin existentes y llamadas repetidas secuenciales, nunca `Promise.all`, para respetar el comportamiento conocido de rate-limit/race.
- Fallos parciales de HRV/readiness/weekly no tiran toda la visualizacion; auth/rate-limit si son terminales.
- Componentes Recharts provider-agnostic en `client/src/components/analytics/`:
  - selector de periodo,
  - barras de volumen semanal,
  - line charts de recovery,
  - seccion integrada al dashboard.
- `DashboardPage.jsx` conserva UI existente; el diff de integracion agrega solo import + montaje de `AnalyticsTrendsSection`.
- Recharts ya existia en dependencias; no se agrego una libreria de graficas nueva.
- No se agrego PostgreSQL/PostGIS, Strava, FIT, GPX, Komoot ni Garmin Developer Program en este alcance.

## Verificacion disponible en esta sesion
- Verificaciones locales con Node ejecutadas para canonical normalizer, weekly/recovery analytics, rolling averages, loader historico y calendar clamping.
- Vercel reporto `success` para el commit de integracion del dashboard, confirmando que el frontend con JSX/imports/Recharts compilo en el pipeline remoto.
- El repositorio no tiene workflow GitHub Actions de client tests/lint; por eso no se debe afirmar que el `npm test`/`npm run lint` completo fue ejecutado por CI en esta rama.

## Estado previo relevante
- Sesion Garmin persistente via cookie HttpOnly + cache de respuestas en localStorage sigue siendo la arquitectura actual.
- Heatmap de entrenamientos sigue usando fetch secuencial y detalle de actividad reducido para visualizacion; no se usa ese track reducido como fuente canonica de alta fidelidad.
- El fix del falso `429/rate limited` SI esta commiteado y pusheado: `8240b72b1e9a08fe8b3bdb7724e2cca0c8b6d7a7` (`fix: only treat Garmin rate-limit/MFA signals as errors on a failed run`).
- El bloqueo real de Garmin por reputacion de IP de datacenter puede seguir ocurriendo en Render durante login.

## Pendiente fuera de este alcance
1. Smoke test autenticado con datos Garmin reales para validar tiempos y carga de periodos historicos.
2. Medir costo real de `4w/12w/6m/1y`; si el volumen de llamadas es demasiado alto, introducir persistencia/ingestion historica antes de aumentar concurrencia.
3. Activity Explorer `/activities/:id` con track/altitud/HR/speed/cadence/power.
4. Persistencia canonica PostgreSQL/PostGIS cuando historial/multisource lo requiera.
5. Providers adicionales: Strava, FIT, GPX, Komoot GPX y Garmin oficial.
6. Bug preexistente: `/api/training-status` usa `training-status` pero el CLI real usa `training`.
7. Bloqueo real de login Garmin desde IP de Render.

## Decisiones fijas
- El UI y analytics nuevos consumen nombres canonicos; parsing Garmin vive solo en el normalizador/provider boundary.
- Datos ausentes se mantienen como `null`; no convertir a cero.
- Fetch repetitivo contra Garmin permanece secuencial hasta tener evidencia de que otra estrategia es segura.
- Preferir minima infraestructura externa mientras el navegador/cache actual sea suficiente.
- Nunca automatizar ni almacenar credenciales Garmin reales del usuario.
- Nunca usar NTFS junctions para exponer repos git separados dentro de worktrees.

## Siguiente paso
- Revisar la rama `feature/canonical-analytics-trends`, ejecutar smoke test autenticado con cuenta real y decidir integracion a `main` una vez verificado el comportamiento historico contra Garmin real.
