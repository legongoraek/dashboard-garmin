# Estado del proyecto - dashboard-garmin
_Ultima actualizacion: 2026-09-08 11:10_

## Hecho
- Sesion persistente de Garmin via cookie HttpOnly + cache de respuestas via localStorage, reemplazando una implementacion anterior con Upstash Redis (nunca llego a produccion real). Mergeado y pusheado a `main` (`7fb154e..eedcbea`). Server 3/3 tests, client 5/5 tests, ambos en verde en `main`.
- Spec: [docs/superpowers/specs/2026-08-30-garmin-cookie-session-and-local-cache-design.md](../docs/superpowers/specs/2026-08-30-garmin-cookie-session-and-local-cache-design.md)
- Plan: [docs/superpowers/plans/2026-08-30-garmin-cookie-session-and-local-cache.md](../docs/superpowers/plans/2026-08-30-garmin-cookie-session-and-local-cache.md) (6 tareas, 5 de codigo ejecutadas via subagent-driven-development, 1 manual pendiente — ver Pendiente).

## En curso
- Brainstorming (arquitectural) de una feature nueva: "AthleteData" resulto ser dos referencias externas (athletedata.health = coach IA, baselineathlete.com = dashboard visual con heatmap/training load). Usuario eligio: arrancar por el subsistema visual tipo Baseline, primera feature concreta = heatmap de entrenamientos (mapa con todas las rutas GPS).
- Diseno presentado en chat (arquitectura, servidor, cliente, libreria de mapa) y el usuario dijo "si" (aprobado) justo antes de este guardado de estado. **Faltan por presentar y aprobar**: seccion de manejo de errores y seccion de testing (prometidas en el mismo mensaje, no escritas aun).
- Decision de diseno ya tomada pero NO escrita a un spec file todavia: extender `ai-skill-garmin/skills/garmin-connect/scripts/garmin.ts` (antes tratado como caja negra intocable) con un comando nuevo `activity-detail <activityId>` para traer polyline GPS — Garmin no expone GPS en el endpoint de lista de actividades que ya se usa.

## Pendiente
1. Terminar de presentar diseno (error handling + testing) y conseguir aprobacion completa del usuario.
2. Escribir el spec a `docs/superpowers/specs/YYYY-MM-DD-heatmap-actividades-design.md` (o nombre similar), commitear.
3. `writing-plans` -> plan de implementacion.
4. Ejecutar plan (subagent-driven-development, mismo flujo que la feature de cookies).
5. Verificacion manual con cuenta Garmin real: el endpoint exacto de detalle de actividad (`/activity-service/activity/{id}/details`, supuesto de proyectos community tipo python-garminconnect/GarminDB) **no esta confirmado** contra la API real de Garmin — es el primer riesgo tecnico a validar apenas haya implementacion.
6. Pendiente de sesiones anteriores, sin tocar: bug PRE-EXISTENTE (no de la rama de cookies) donde el prompt de MFA nunca se renderiza en el login (`LoginPage.jsx` nunca llega a chequear `requiresMfa` porque `requestApi` ya tira error antes). Bloquea cualquier prueba manual que requiera completar MFA.
7. Pendiente de decidir con el usuario (no arrancado): variables de entorno viejas de Upstash (`UPSTASH_REDIS_REST_URL`/`_TOKEN`) probablemente siguen seteadas en Render sin uso — se pueden borrar cuando quiera, no rompen nada si quedan.
8. Subsistemas 2 y 3 de "AthleteData" (IA/coach tipo athletedata.health, y el resto de Baseline: training load CTL/ATL/TSB, curva de potencia critica, correlacion recovery-vs-performance) — ni empezados, cada uno necesita su propio ciclo spec->plan->implementacion cuando llegue su turno.

## Decisiones y contexto
- Usuario prefiere cero infraestructura de terceros/servidor propio cuando hay alternativa viable en el navegador (por eso se reemplazo Redis por cookie+localStorage).
- garmin.ts se puede extender cuando hace falta un dato que Garmin no expone en los comandos actuales — ya no es 100% caja negra, pero se sigue evitando tocarlo sin necesidad real.
- Para features nuevas con llamadas repetidas a la API de Garmin (ej. detalle GPS por actividad), preferir fetch secuencial sobre paralelo — leccion aprendida de una race condition real encontrada en revision final de la feature de cookies (escrituras concurrentes a `tokens.json`).
- Libreria de mapa elegida: `react-leaflet` + `leaflet.heat` + tiles OpenStreetMap (gratis, sin API key), verificado compatible con React 19 via context7.
- El skill `frontend-design` (marketing/landing pages) se evaluo y se descarto aplicar de lleno para esta feature: es un dashboard interno ya con identidad visual propia (MUI, tema azul), no un producto nuevo que necesite marca distintiva.

## Siguiente paso concreto
Retomar el mensaje de diseno donde quedo cortado: escribir y presentar las secciones de "manejo de errores" y "testing" del heatmap de entrenamientos (el usuario ya aprobo arquitectura/servidor/cliente/libreria con un "si"). Despues, spec -> writing-plans -> ejecucion, siguiendo el mismo flujo de subagent-driven-development ya usado para la feature de cookies.
