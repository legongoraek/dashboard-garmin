# Estado del proyecto - dashboard-garmin
_Ultima actualizacion: 2026-09-14_

## Estado general
- Desarrollo directo a `main` por instruccion explicita del usuario.
- GitHub se usa para versionado; GitHub Actions/CI/CD no es requisito ni fuente de verdad para validar el proyecto.
- La validacion oficial debe ejecutarse localmente desde el repositorio con los scripts raiz.
- Arquitectura provider-agnostic basada en modelo canonical.
- Fases 1-10: codigo implementable sin credenciales/infraestructura externa cubierto. Lo pendiente se limita a activaciones externas y smoke tests contra servicios reales.

## Fases 1-7

### Canonical + analytics + trends
- Activity, DailyHealth, Sleep, Recovery, Sample y TrackPoint canonical.
- Garmin normalizer con provenance y preservacion estricta de `null` vs `0`.
- Analytics para `7d`, `4w`, `12w`, `6m`, `1y`, rolling averages y errores parciales.
- Recharts provider-agnostic.

### Activity Explorer
- `/activities/:id` para Garmin.
- `/imported/:id` para actividad canonical local/importada.
- Ruta, elevacion, FC, velocidad, cadencia y potencia cuando existen.

### Persistencia
- IndexedDB `dashboard-garmin-analytics` como default cero-infra.
- Backup/restauracion/borrado canonical local.
- Archivo historico Garmin automatico sin destruir detail enriquecido existente.
- PostgreSQL/PostGIS runtime, schema, store, migracion y health check preparados.

### Providers
- Garmin legacy, Garmin official, Strava, FIT, GPX y Komoot.
- GPX browser-native.
- Komoot mediante GPX oficial.
- FIT mediante `@garmin/fitsdk@21.214.0`.
- Strava OAuth2 server-side con state CSRF, cookies HttpOnly, refresh, revoke, activities y streams.
- Garmin official boundary canonical preparado sin inventar auth/endpoints antes de aprobacion.

## Fase 8 - multisource analytics avanzado
Estado de codigo: completado para el alcance actual.

- Deduplicacion multisource conserva todas las evidencias de fuente.
- Primary record elegido por riqueza de datos y prioridad de provider solo como desempate.
- Campos faltantes se completan de forma conservadora sin reemplazar valores existentes.
- `sourceQualityFlags` se unen sin duplicados.
- YoY semanal y YTD sobre historia canonical persistida.
- Deduplicacion usa UTC cuando existe para comparar el mismo instante entre providers; agrupaciones temporales de analytics conservan fecha local.
- Ya no se depende exclusivamente de buckets redondeados para unir duplicados: el matcher usa tolerancias reales y conservadoras.
- Matching actual:
  - misma identidad canonical/source id => match directo;
  - registros distintos de la misma fuente no se fusionan por heuristica;
  - mismo tipo normalizado;
  - diferencia de inicio <= 5 min;
  - duracion: tolerancia max(120 s, 5%);
  - distancia: tolerancia max(250 m, 3%);
  - requiere al menos duracion o distancia comparable.
- El matcher evita el falso negativo de actividades equivalentes ubicadas a lados distintos del limite de un bucket redondeado.

## Fase 9 - validacion autonoma local
Estado de codigo: completado.

Comandos raiz:

```bash
npm run verify:install
npm run verify
npm run verify:quick
npm run verify:runtime
npm run smoke
```

`verify:install`:
1. `npm ci` client
2. `npm ci` server
3. root tests
4. client tests
5. client lint
6. client build
7. server tests
8. backend runtime smoke autocontenido

`verify` ejecuta los pasos 3-8 sin reinstalar dependencias.
`verify:quick` ejecuta root tests + client tests + server tests.

Implementacion:
- `package.json` raiz sin dependencias externas.
- `scripts/verificationPlan.mjs`
- `scripts/verificationPlan.test.mjs`
- `scripts/verify.mjs`
- el gate prueba tambien sus propios scripts raiz.
- compatible con Windows (`npm.cmd`) y Linux/macOS (`npm`).
- fail-fast y exit code != 0 ante cualquier paso fallido.
- GitHub Actions puede existir como redundancia, pero no participa en la definicion de codigo valido.

## Fase 10 - produccion y operabilidad
Estado de codigo: completado para todo lo que no requiere servicios externos.

### Health/readiness
- `/api/health` para liveness del backend.
- `/api/providers` para readiness de providers.
- `/api/providers/postgres/health` para PostgreSQL/PostGIS bajo demanda.

### Smoke checks
- `scripts/smoke.mjs`
- `scripts/smoke.test.mjs`
- `npm run smoke` valida una instancia ya levantada/desplegada.
- soporta `--base-url=` y `API_BASE_URL`.
- timeout de 10 s por endpoint y exit code != 0 ante fallo.

### Runtime verification autocontenida
- `scripts/runtimeVerify.mjs`
- `npm run verify:runtime`
- `server/index.js` exporta `app` y `startServer()` sin arrancar automaticamente cuando se importa como modulo.
- runtime verification inicia Express en puerto efimero (`0`), resuelve el puerto real, comprueba `/api/health` + `/api/providers` y cierra el servidor en `finally`.
- no requiere Strava, Garmin Developer ni PostgreSQL/PostGIS para la comprobacion base.

### Lifecycle de produccion
- `server/runtimeLifecycle.js`
- `server/runtimeLifecycle.test.js`
- shutdown idempotente ante `SIGTERM`/`SIGINT`.
- cierre correcto => exit code 0.
- fallo al cerrar => exit code 1 con error controlado.
- el lifecycle se adjunta solo cuando `server/index.js` es ejecutado directamente, no al importarlo para tests/runtime smoke.

### Portabilidad/privacidad
- Backup canonical local, restauracion y borrado ya implementados.
- Exact GPS, biometria y recovery permanecen dentro del area privada.
- Deploy Vercel/Render es una capa de ejecucion; no es el gate tecnico del codigo.

## Verificacion realizada en esta sesion
- TDD RED reproducido para el defecto de dedup en limite de bucket: el algoritmo anterior devolvia 2 actividades logicas para registros equivalentes separados por segundos.
- TDD RED reproducido para el gate local: la secuencia anterior omitía `root:test`.
- TDD RED reproducido para runtime: no existia resolucion de URL/puerto efimero.
- TDD RED reproducido para lifecycle: no existia `createShutdownHandler`.
- Verificacion local aislada con Node 22 de los modulos nuevos/actualizados, sin depender de GitHub Actions:
  - verification plan
  - smoke/runtime helpers
  - lifecycle
  - 13 tests ejecutados
  - 13 pass
  - 0 fail
- No se declara una verificacion completa del workspace en este entorno porque no dispone de un checkout completo con todas las dependencias instaladas.
- La evidencia completa debe obtenerse en un checkout local real mediante `npm run verify:install`; despues, `npm run verify` es el gate diario.

## Blockers externos reales
1. Strava live requiere `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI` y autorizacion OAuth.
2. Garmin official live requiere aprobacion del Developer Program y credenciales emitidas por Garmin.
3. PostgreSQL/PostGIS live requiere provisionar DB, definir `DATABASE_URL` y ejecutar `npm run migrate:analytics`.
4. Garmin legacy en Render puede sufrir bloqueos/rate-limit reales por IP de datacenter.
5. Smoke tests live contra integraciones externas requieren sus servicios/credenciales; no se inventan ni almacenan secretos reales del usuario.

## Decisiones fijas
- UI/analytics nuevos consumen canonical, nunca payloads provider-specific.
- Missing permanece `null`; no se convierte en cero.
- Requests repetitivas a Garmin y sync Strava se mantienen secuenciales.
- IndexedDB es default mientras Postgres/PostGIS no este configurado y migrado.
- YoY usa historia persistida, no cientos de requests al Garmin legacy.
- Dedup conserva provenance de todas las fuentes.
- Exact GPS, biometria y recovery se consideran datos sensibles.
- Provider tokens permanecen server-side/HttpOnly cuando aplica.
- Nunca automatizar ni almacenar credenciales Garmin reales del usuario.
- Nunca usar NTFS junctions para exponer repos git separados dentro de worktrees.
