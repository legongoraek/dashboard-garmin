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
| P-006 | HECHO | P3 | Providers / Garmin legacy | Garmin bloquea el LOGIN inicial desde la IP del servidor en Render (`OAuth1 exchange failed: 429 Rate limited`) — reputación de IP de datacenter, no bug de código. No ocurre en local | Reputación de IP de datacenter ante Garmin; fuera de nuestro control directo, y ninguna solución gratis/sin cambiar hosting lo evita | Resuelto como procedimiento, no como código: se confirmó en `ai-skill-garmin/skills/garmin-connect/scripts/garmin.ts:29-31,505-507` que el bloqueo solo afecta el login OAuth1 completo (con MFA); el refresco diario (OAuth2 desde el OAuth1 cacheado) usa un endpoint distinto y no requiere MFA, dura ~1 año y por eso producción funciona normal día a día. El evento es ~anual, no diario. Se descartó construir un endpoint admin para "importar sesión" (usuario lo pidió explícitamente simple, sin superficie nueva de ataque). Receta de 5 minutos sin código nuevo documentada en `GUIA.md` sección 4: login local + copiar cookie `garmin_tokens` vía DevTools + pegarla en el dominio de Render + `localStorage.garmin_session=true` en producción | 2026-09-14 | `GUIA.md` §4; código de referencia citado arriba; workaround ya usado una vez con éxito en el incidente original |
| P-007 | HECHO | P1 | Landing / Login | La landing pública invitaba a cualquier visitante a "Iniciar sesión" como si el login con su propia cuenta Garmin fuera a funcionar — pero la app es single-tenant en toda la arquitectura (sin `user_id` en el schema de Postgres, una sola cookie `garmin_tokens`, un solo IndexedDB) y el login en producción está bloqueado para cualquiera que no sea el autor (P-006). El usuario señaló que esto era engañoso, y luego señaló que el botón de login seguía apareciendo en el navbar/cierre (solo se había arreglado el del hero) y que ese CTA no debía mostrarse porque no funciona ni para el propio autor en producción. También pidió aplicar `frontend-design` para mejorar la UI/UX de la landing | Ninguno, ya implementado | — | 2026-09-14 | Commits `1eb7138` (mensajes honestos) y `f7874e2` (quita el CTA `/login` de los 3 lugares de la landing — navbar, hero, cierre — y rediseño con identidad propia: paleta trail-log, tipografía Big Shoulders Display/IBM Plex Sans/IBM Plex Mono, gráfico de perfil de elevación como elemento signature; alcance limitado a `LandingPage.jsx`, sin tocar el theme MUI compartido ni el dashboard autenticado). `landingStatic.test.js` actualizado para afirmar ausencia de `/login` público. Verificado con `npm run verify` (todo verde) y preview local desktop+mobile |

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
