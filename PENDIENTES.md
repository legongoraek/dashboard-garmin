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
| P-001 | BLOQUEADO | P1 | Providers / Strava | Activar integración Strava en entorno real | Externo | Requiere `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI` y autorización OAuth del usuario | Configurar secretos en el entorno seguro y ejecutar flujo OAuth + smoke live | 2026-09-14 | Código OAuth/readiness ya implementado |
| P-002 | BLOQUEADO | P1 | Providers / Garmin Official | Activar Garmin Developer Program oficial | Externo | Requiere aprobación del Garmin Developer Program y credenciales emitidas por Garmin | Al recibir aprobación, configurar credenciales y validar integración live sin cambiar consumidores canonical | 2026-09-14 | Boundary/readiness canonical ya implementado |
| P-003 | BLOQUEADO | P1 | Persistencia / PostgreSQL | Activar PostgreSQL/PostGIS real | Externo | Requiere instancia provisionada y `DATABASE_URL` | Provisionar DB, definir `DATABASE_URL`, ejecutar `npm run migrate:analytics` y validar health | 2026-09-14 | Runtime, store, migración y health check ya implementados |
| P-004 | PENDIENTE | P2 | Verificación | Ejecutar certificación completa del workspace en checkout local real | Agent / Claude / Manual | Este entorno no dispone del workspace completo con dependencias instaladas | Ejecutar `npm run verify:install`; si pasa, registrar commit/fecha/resultado aquí | 2026-09-14 | Pendiente de evidencia completa local |
| P-005 | PENDIENTE | P2 | Integraciones live | Ejecutar smoke live contra providers activados | Agent / Claude / Manual | Depende de activar P-001/P-002/P-003 según provider | Ejecutar smoke/readiness live y registrar resultados por provider | 2026-09-14 | Smoke local autocontenido ya implementado |

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
