# Estado del proyecto - dashboard-garmin
_Ultima actualizacion: 2026-09-14_

## Estado general
- Desarrollo directo a `main` por instruccion explicita del usuario.
- GitHub se usa para versionado; GitHub Actions/CI/CD no es requisito ni fuente de verdad para validar el proyecto.
- La validacion oficial debe ejecutarse localmente desde el repositorio con los scripts raiz.
- Arquitectura provider-agnostic basada en modelo canonical.

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
- Esto elimina el falso negativo de actividades separadas por segundos pero ubicadas en lados opuestos del limite de un bucket redondeado.

## Fase 9 - validacion autonoma local
Implementada en codigo sin dependencia de CI/CD.

Comandos raiz:

```bash
npm run verify:install
npm run verify
npm run verify:quick
```

`verify:install`:
1. `npm ci` client
2. `npm ci` server
3. client tests
4. client lint
5. client build
6. server tests

`verify` ejecuta tests/lint/build sin reinstalar.
`verify:quick` ejecuta client tests + server tests.

Implementacion:
- `package.json` raiz sin dependencias externas.
- `scripts/verificationPlan.mjs`
- `scripts/verificationPlan.test.mjs`
- `scripts/verify.mjs`
- compatible con Windows (`npm.cmd`) y Linux/macOS (`npm`).
- fail-fast y exit code != 0 ante cualquier paso fallido.

## Fase 10 - codigo implementable sin credenciales externas
- `/api/health` ya existe para liveness del backend.
- `/api/providers` ya existe para readiness de providers.
- `/api/providers/postgres/health` ya existe para Postgres/PostGIS bajo demanda.
- Smoke checks autonomos agregados:
  - `scripts/smoke.mjs`
  - `scripts/smoke.test.mjs`
  - `npm run smoke`
  - valida `/api/health` y `/api/providers`.
  - soporta `--base-url=` y `API_BASE_URL`.
  - timeout de 10 s por endpoint y exit code != 0 si falla alguno.
- Backup canonical local y controles de privacidad/portabilidad ya existen.
- Deploy actual puede seguir usando Vercel/Render, pero no participa en la definicion de codigo valido.

## Verificacion realizada en esta sesion
- TDD RED reproducido localmente para el defecto de dedup en limite de bucket: el algoritmo anterior devolvia 2 actividades logicas para registros equivalentes separados por 2 s.
- Tests aislados de los nuevos modulos de validacion/smoke ejecutados localmente con Node 22:
  - 7 tests
  - 7 pass
  - 0 fail
- No se declara una verificacion completa del repositorio en este entorno porque no tiene acceso de red para clonar GitHub ni instalar/reconstruir todo el workspace.
- La fuente de verdad completa queda en `npm run verify:install` ejecutado sobre un checkout local real.

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
