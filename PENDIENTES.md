# Pendientes — dashboard-garmin

Este archivo es la fuente única de verdad para trabajo pendiente detectado por agentes, Claude, ChatGPT o revisión manual.

## Reglas de uso

- Revisar este archivo antes de comenzar trabajo nuevo.
- Registrar cualquier pendiente nuevo que no pueda resolverse en la sesión actual.
- No borrar pendientes: al terminar, cambiar su estado a `HECHO` y añadir evidencia.
- Si un punto queda bloqueado, usar `BLOQUEADO` y continuar con otro pendiente que sí sea ejecutable.
- Evitar duplicados. Antes de agregar un punto, buscar si ya existe uno equivalente.
- Mantener una sola fila por pendiente lógico.
- Cuando un pendiente cambie, actualizar `Última actualización`.
- Para trabajo de código, la evidencia ideal es commit + prueba/comando de verificación.
- GitHub Actions/CI/CD no es fuente de verdad. La validación del proyecto es local mediante los scripts raíz.

## Estados

- `PENDIENTE` — identificado, aún no iniciado.
- `EN_PROGRESO` — trabajo activo.
- `BLOQUEADO` — requiere una condición externa o información no disponible.
- `HECHO` — terminado y con evidencia registrada.

## Prioridades

- `P0` — bloquea uso crítico o compromete datos/seguridad.
- `P1` — alta prioridad funcional/técnica.
- `P2` — mejora importante pero no bloqueante.
- `P3` — mejora opcional o futura.

## Backlog activo

| ID | Estado | Prioridad | Fase/Área | Pendiente | Origen/Responsable | Bloqueo | Siguiente acción | Última actualización | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| P-001 | BLOQUEADO | P1 | Providers / Strava | Activar integración Strava en entorno real | Externo | Usuario tiene cuenta Strava gratuita (sin suscripción paga) — confirmado que la API de Strava no requiere suscripción, solo cuenta. Falta que el usuario cree la app en strava.com/settings/api y entregue `STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET` | Usuario crea la app en strava.com/settings/api (pasos en GUIA.md §1.1) y entrega credenciales; luego configurar en Render + flujo OAuth + smoke live | 2026-09-14 | Código OAuth/readiness ya implementado |
| P-002 | BLOQUEADO | P3 | Providers / Garmin Official | Activar Garmin Developer Program oficial | Externo | Revisado developer.garmin.com/gc-developer-program (overview + FAQ) el 2026-09-14: (1) programa es explícitamente "for business use"/"enterprise use", no queda claro que un dashboard personal califique; (2) sin costo de licencia base, pero "access to some metrics may require a license fee payment or minimum device order quantity for commercial use"; (3) no hay botón/link de solicitud visible en la página, y el banner "Stay tuned for more updates on the program" sugiere que las solicitudes nuevas están pausadas por ahora | Usuario decide si aplica igual (posible rechazo por no ser negocio) o espera a que el programa reabra solicitudes; si aplica, contactar por el email de soporte que indica la FAQ | 2026-09-14 | Boundary/readiness canonical ya implementado |
| P-003 | BLOQUEADO | P1 | Persistencia / PostgreSQL | Activar PostgreSQL/PostGIS real | Externo | Requiere instancia provisionada y `DATABASE_URL` | Provisionar DB, definir `DATABASE_URL`, ejecutar `npm run migrate:analytics` y validar health | 2026-09-14 | Runtime, store, migración y health check ya implementados |
| P-004 | HECHO | P2 | Verificación | Ejecutar certificación completa del workspace en checkout local real | Claude (Windows local) | Ninguno | — | 2026-09-14 | `npm run verify:install` PASS end-to-end (client:install, server:install, root:test, client:test, client:lint, client:build, server:test, root:runtime). Corrigió 2 bugs reales encontrados en la primera ejecución real: (1) `scripts/verify.mjs` usaba `spawnSync("npm.cmd", ..., { shell: false })`, que revienta con `EINVAL` en Node 22/Windows — fix: `shell: process.platform === "win32"`; (2) fixtures de `client/src/domain/analytics/multisourceAnalytics.test.js` (tests YoY) reusaban el `sourceActivityId` default `"1"` entre actividades de años distintos, y `sameIdentity()` las fusionaba en una sola por (source+sourceActivityId) — fix: `sourceActivityId` único por fixture |
| P-005 | PENDIENTE | P2 | Integraciones live | Ejecutar smoke live contra providers activados | Agent / Claude / Manual | Depende de activar P-001/P-002/P-003 según provider | Ejecutar smoke/readiness live y registrar resultados por provider | 2026-09-14 | Smoke local autocontenido ya implementado |
| P-006 | BLOQUEADO | P2 | Providers / Garmin legacy | Garmin bloquea el LOGIN inicial desde la IP del servidor en Render (`OAuth1 exchange failed: 429 Rate limited`) — reputación de IP de datacenter, no bug de código. No ocurre en local. Aún no confirmado si el refresco automático de una sesión ya cargada también falla desde Render, o solo el login inicial | Reputación de IP de datacenter ante Garmin; fuera de nuestro control directo | Decisión tomada: esperar y ver. Restricciones del usuario: no cambiar hosting, no dispositivo local siempre encendido, no pagar nada, no repetir copy-paste manual de token cada vez. Si el refresco automático también resulta bloqueado (hoy solo el login inicial está confirmado bloqueado), ninguna solución cumple las 4 restricciones a la vez — algo va a ceder, probablemente "manual pero raro" si el bloqueo resulta ser ~anual. Workaround ya usado una vez con éxito: login local + trasplante manual de cookie `garmin_tokens` + `localStorage.garmin_session=true` en producción | 2026-09-14 | Sin evidencia nueva desde el incidente original; monitorear si el refresco automático falla en producción |

## Pendientes completados

Mover aquí los elementos cuando sea útil reducir el tamaño del backlog activo, conservando ID, fecha y evidencia.

| ID | Estado | Área | Resultado | Fecha | Evidencia |
|---|---|---|---|---|---|

## Plantilla para nuevos pendientes

Copiar una fila y asignar el siguiente ID secuencial:

```text
| P-XXX | PENDIENTE | P1/P2/P3 | Área/Fase | Descripción concreta | Agent/Claude/ChatGPT/Manual | Ninguno o bloqueo concreto | Próxima acción ejecutable | YYYY-MM-DD | Commit/test/enlace o pendiente |
```

## Criterio para cerrar un pendiente

Un punto solo pasa a `HECHO` cuando:

1. El cambio requerido está implementado o la acción externa fue completada.
2. La validación correspondiente fue ejecutada.
3. Se registró evidencia suficiente para que otro agente pueda comprobar qué ocurrió.
4. Si surgieron nuevos trabajos derivados, ya están registrados como nuevos IDs antes de cerrar el original.
