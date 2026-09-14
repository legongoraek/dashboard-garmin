# CLAUDE.md — dashboard-garmin

Instrucciones de trabajo para Claude Code en este repositorio.

## Pendientes compartidos

Al iniciar una sesión, leer primero `PENDIENTES.md`.

Ese archivo es la fuente compartida de trabajo pendiente entre Claude, otros agentes, ChatGPT y trabajo manual. Claude debe actualizarlo activamente conforme encuentre, inicie, bloquee o complete trabajo.

## Comportamiento esperado

- No detener toda la ejecución porque un punto esté bloqueado.
- Si un bloqueo externo impide continuar un punto, marcarlo `BLOQUEADO`, documentar la causa y seguir con el siguiente pendiente ejecutable.
- Si durante una tarea aparecen trabajos derivados que no se completarán en la misma sesión, registrarlos antes de terminar.
- No borrar pendientes cerrados para ocultar historial; usar `HECHO` y evidencia.
- Evitar crear duplicados de pendientes ya existentes.

## Estados permitidos

- `PENDIENTE`
- `EN_PROGRESO`
- `BLOQUEADO`
- `HECHO`

## Actualización de `PENDIENTES.md`

Para cada pendiente afectado:

1. Mantener su ID estable.
2. Actualizar estado y prioridad si cambian.
3. Actualizar `Bloqueo` cuando corresponda.
4. Escribir una `Siguiente acción` concreta y ejecutable.
5. Actualizar la fecha.
6. Al completar, registrar evidencia: commit, pruebas, comando ejecutado o resultado verificable.

## Reglas técnicas del proyecto

- Trabajar directo a `main` mientras esa instrucción del usuario siga vigente.
- GitHub Actions/CI/CD no es la fuente de verdad para validación.
- Validación local oficial:
  - `npm run verify:install`
  - `npm run verify`
  - `npm run verify:quick`
- No afirmar que un gate pasó si no se ejecutó realmente.
- Para features/bugfixes, preferir TDD: prueba que falla, implementación mínima, prueba verde y verificación.
- No introducir secretos reales en archivos, commits, logs o documentación.
- No inventar credenciales ni comportamiento de Strava, Garmin Developer u otros servicios externos.
- Mantener la arquitectura provider-agnostic y el modelo canonical como boundary de UI/analytics.
- Preservar `null` para datos ausentes; no convertirlos silenciosamente a `0`.
- Mantener requests repetitivas sensibles a rate limits de forma secuencial salvo que exista evidencia para cambiarlo.

## Cierre de sesión

Antes de finalizar una sesión de Claude:

1. Revisar `git diff`/estado de cambios relevantes.
2. Ejecutar la verificación aplicable al alcance realizado.
3. Actualizar `PENDIENTES.md` con todos los resultados.
4. Registrar nuevos pendientes detectados.
5. Dejar cualquier bloqueo externo claramente explicado.
6. No dejar un pendiente `EN_PROGRESO` si en realidad quedó bloqueado o abandonado; reflejar el estado real.
