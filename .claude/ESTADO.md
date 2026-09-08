# Estado del proyecto - dashboard-garmin
_Ultima actualizacion: 2026-09-08 14:20_

## Hecho
- Sesion persistente de Garmin via cookie HttpOnly + cache de respuestas via localStorage (reemplazo Upstash Redis, nunca llego a produccion). En `main`, pusheado.
- Heatmap de entrenamientos: comando nuevo `activity-detail` en `ai-skill-garmin/skills/garmin-connect/scripts/garmin.ts`, endpoint `/api/activity-detail`, cache client-side con TTL de 365 dias, fetch secuencial (nunca paralelo) en `client/src/services/heatmapData.js`, componente `TrainingHeatmap.jsx` con `react-leaflet`+`leaflet.heat`. Mergeado a `main` y pusheado (commits `c4b6b29..0327f3d`, merge `88f460c`).
  - Spec: `docs/superpowers/specs/2026-09-08-training-heatmap-design.md`
  - Plan: `docs/superpowers/plans/2026-09-08-training-heatmap.md`
- **VERIFICADO CON DATOS REALES (local, cuenta real del usuario):** el heatmap funciona de punta a punta. 180 actividades (rango 2026-01-01..2026-09-08), 0 omitidas, sin truncar, mapa de calor real renderizado sobre Progreso/Yucatan. Confirma que el supuesto sobre el endpoint de Garmin (`geoPolylineDTO.polyline` en `/activity-service/activity/{id}/details`) era correcto desde el diseño original — no hizo falta ajustarlo.
- **Incidente y recuperacion (mismo dia):** `git worktree remove` siguio una NTFS junction que yo cree pa exponer `ai-skill-garmin` dentro de un worktree, y borro el contenido REAL de `D:\Proyectos\dashboard-garmin\ai-skill-garmin` (incluyendo su `.git`). Reclone limpio + reconstrui el codigo exacto en un commit nuevo `bcd0c1c` en `ai-skill-garmin` (main local de ese repo, no pusheado — repo publico de otro autor, no del usuario). Verificado: `bun test` 5/5.
- Login (`client/src/pages/LoginPage.jsx`): validacion basica de campos vacios (sin pegarle al backend), toggle mostrar/ocultar password, mensaje de error real en vez del generico. Commit `5ee0302` (autor: usuario, sobre mis cambios).
- `server/garminService.js` — `cleanErrorMessage()`: limpia el error crudo de login (ej. `INVALID_USERNAME_PASSWORD` → "Usuario o contraseña de Garmin incorrectos."). Commit `45447ff`, pusheado.
- **Bug real encontrado y arreglado — falso "rate limited":** `runGarminCommand` marcaba CUALQUIER respuesta (exitosa o no) como "Garmin bloqueó temporalmente el login" si el texto combinado stdout+stderr contenia la substring `"429"` en cualquier lado — y datos reales (timestamps, distancias, IDs de actividad) la contienen todo el tiempo por casualidad. Confirmado en vivo: pedir actividades desde 2026-01-01 disparo el falso positivo 56 veces en un solo payload. Arreglado moviendo el chequeo de MFA/rate-limit DENTRO de `if (error)` (solo aplica cuando el proceso realmente fallo, nunca sobre una respuesta exitosa) — verificado local: mismo request que antes fallaba ahora carga las 180 actividades sin problema. Commit pendiente de pushear (ver Pendiente).
- Confirmado por separado: el bloqueo real de Garmin (`OAuth1 exchange failed: 429 Rate limited`) SI ocurre en produccion (Render) durante el LOGIN completo — es bloqueo de reputacion de IP de datacenter, no relacionado al bug de arriba. No pasa en local. Sin resolver aun (ver Pendiente).

## En curso
- Nada a medias en este momento — el ultimo fix (false-positive de rate-limit) quedo verificado en local pero SIN COMMITEAR/PUSHEAR todavia (ver Siguiente paso).

## Pendiente
1. **Commitear y pushear el fix del falso "429"** en `server/garminService.js` (cambio ya verificado, ver arriba) — esto es el paso inmediato siguiente.
2. Decidir que hacer con el bloqueo REAL de Garmin en Render (IP de datacenter). Opciones discutidas con el usuario: (a) login local + trasplantar la sesion a produccion manualmente via cookie de DevTools (sin tocar codigo), (b) mover el hosting del backend a algo con mejor reputacion de IP, (c) por ahora, no se sabe si el REFRESCO automatico de sesion (una vez cargada) tambien esta bloqueado desde Render, o solo el LOGIN inicial — falta probar eso.
3. Bug PRE-EXISTENTE sin tocar: `/api/training-status` llama al subcomando CLI `training-status`, que no existe en `garmin.ts` (es `training`) — 500 siempre. Nada en el dashboard la llama hoy.
4. Nuevo, visto en esta sesion sin investigar: "No se pudo cargar Weekly Summary" aparecio en el dashboard local durante las pruebas — no se investigo la causa, podria ser el mismo tipo de bug (o real falta de datos).
5. Variables de entorno viejas de Upstash en Render, sin uso, se pueden borrar cuando el usuario quiera.
6. Subsistemas 2 y 3 de la idea original "AthleteData": coach IA tipo athletedata.health, y el resto del dashboard tipo Baseline (training load, curva de potencia critica, correlacion recovery-vs-performance) — ni empezados.

## Decisiones y contexto
- Usuario prefiere cero infraestructura de terceros/servidor propio cuando hay alternativa viable en el navegador.
- `garmin.ts` ya no es 100% caja negra — se extiende cuando hace falta un dato que Garmin no expone (ej. GPS), evitando tocarlo sin necesidad real.
- Fetch secuencial (nunca paralelo) pa llamadas repetidas a Garmin en una sola operacion — leccion de una race condition real en la rama de cookies.
- **Nunca usar NTFS junctions pa exponer un repo git separado dentro de un worktree sin desarmarla a mano ANTES de `git worktree remove`** — sigue la junction como directorio normal y borra el contenido real del destino.
- `ai-skill-garmin` tiene remoto de otro autor (`dsebastien/ai-skill-garmin`) — nunca pushear ahi sin permiso explicito.
- Regla fija (no negociable, ni con autorizacion del usuario): nunca escribir contraseñas/credenciales reales en ningun formulario, ni siquiera en el navegador de automatizacion propio. El usuario debe loguearse el mismo, yo solo preparo el entorno (levantar servers, abrir el navegador) y observo el resultado.
- El chequeo de "429/rate limited" en `garminService.js` ahora vive DENTRO de `if (error)` — si se vuelve a tocar ese archivo, no revertir a chequear el output completo sin condicionarlo al fallo del proceso (eso fue exactamente el bug).

## Siguiente paso concreto
Commitear el fix de `server/garminService.js` (mover el chequeo de rate-limit/MFA dentro de `if (error)`) con un mensaje tipo "fix: only treat Garmin rate-limit/MFA signals as errors on a failed run" y pushear a origin (ya se establecio el patron de pushear con aprobacion del usuario en este mismo hilo). Despues, retomar el punto 2 de Pendiente (que hacer con el bloqueo real de IP en Render) cuando el usuario quiera.
