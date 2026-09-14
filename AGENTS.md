# AGENTS.md — dashboard-garmin

Estas instrucciones aplican a cualquier agente que trabaje en este repositorio.

## Fuente de verdad de pendientes

Antes de iniciar trabajo, leer `PENDIENTES.md`.

`PENDIENTES.md` es el backlog compartido entre agentes, Claude, ChatGPT y trabajo manual. Debe mantenerse actualizado durante el desarrollo.

## Flujo obligatorio

1. Revisar `PENDIENTES.md` antes de comenzar.
2. Si se trabaja sobre un pendiente existente, cambiarlo a `EN_PROGRESO` cuando corresponda.
3. Si se detecta un trabajo nuevo que no puede resolverse en la sesión actual, agregarlo a `PENDIENTES.md` con un ID nuevo.
4. Si un punto queda bloqueado, cambiarlo a `BLOQUEADO`, explicar el bloqueo y continuar con otro punto ejecutable.
5. Cuando se complete, cambiarlo a `HECHO` y registrar evidencia: commit, test, comando de verificación o resultado relevante.
6. No borrar historial útil ni pendientes cerrados sin una razón explícita.
7. Evitar duplicados: buscar primero IDs o descripciones equivalentes.

## Reglas del proyecto

- Desarrollo directo a `main` mientras siga vigente la instrucción explícita del usuario.
- No depender de GitHub Actions/CI/CD para decidir si el código es válido.
- La fuente de verdad de validación es local:
  - `npm run verify:install` para certificación completa reproducible.
  - `npm run verify` para validación completa con dependencias instaladas.
  - `npm run verify:quick` para iteración rápida.
- Para features y bugfixes, usar TDD cuando sea viable: RED → GREEN → verificación.
- Continuar con otros pendientes cuando un bloqueo externo no impida avanzar.
- No inventar credenciales, endpoints privados ni estados de servicios externos.
- No almacenar secretos reales en el repositorio.
- UI y analytics nuevos consumen el modelo canonical; no deben depender de payloads específicos de providers.
- Valores ausentes permanecen `null`; no convertir silenciosamente a cero.

## Registro de pendientes

Cada nuevo pendiente debe incluir al menos:

- ID secuencial `P-XXX`.
- Estado.
- Prioridad.
- Fase/área.
- Descripción concreta.
- Origen/responsable.
- Bloqueo, si existe.
- Siguiente acción ejecutable.
- Fecha de última actualización.
- Evidencia o indicación de que aún falta.

## Al terminar una sesión

Antes de finalizar:

1. Revisar cambios hechos durante la sesión.
2. Actualizar todos los pendientes afectados.
3. Registrar cualquier trabajo descubierto y no terminado.
4. Dejar claro qué está `HECHO`, `BLOQUEADO`, `EN_PROGRESO` o `PENDIENTE`.
5. No declarar una validación que no se haya ejecutado realmente.
