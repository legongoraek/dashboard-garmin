# dashboard-garmin

Dashboard web para visualización y seguimiento de información relacionada con Garmin y otras fuentes de actividad normalizadas a un modelo canónico.

## Validación autónoma local

GitHub Actions no es un requisito ni la fuente de verdad del proyecto. La validación oficial del código se ejecuta desde el propio repositorio y funciona en Windows/Linux con Node.js 22+.

Desde la raíz, para una validación reproducible desde dependencias limpias:

```bash
npm run verify:install
```

Ejecuta `npm ci` en `client` y `server`, seguido de:

1. tests de los scripts raíz de verificación/smoke;
2. client tests;
3. client lint;
4. client build;
5. server tests;
6. runtime smoke autocontenido del backend.

Para iteraciones normales sin reinstalar dependencias:

```bash
npm run verify
```

Para una pasada rápida de tests, sin lint/build/runtime smoke:

```bash
npm run verify:quick
```

`verify:quick` ejecuta tests raíz + tests de client + tests de server.

### Runtime smoke autocontenido

No es necesario levantar manualmente el backend para validar su liveness/readiness básica:

```bash
npm run verify:runtime
```

Este comando inicia el backend en un puerto efímero, valida:

- `/api/health`;
- `/api/providers`;

Luego cierra el servidor de forma limpia. No requiere credenciales de Strava, Garmin Developer ni PostgreSQL/PostGIS.

### Smoke de una instancia ya desplegada o levantada

```bash
npm run smoke
```

Por defecto usa `http://localhost:4000`. Para otra URL:

```bash
npm run smoke -- --base-url=https://dashboard-garmin.onrender.com
```

También puede definirse `API_BASE_URL`.

Los scripts devuelven exit code distinto de cero ante cualquier fallo, por lo que pueden utilizarse desde PowerShell, CMD, Bash, un IDE, hooks locales o cualquier plataforma de CI/CD. CI/CD es una capa opcional, no un gate necesario para desarrollar o comprobar el proyecto.

El backend también registra shutdown limpio ante `SIGTERM` y `SIGINT`, importante para reinicios/despliegues en plataformas como Render.

## Sitios publicados

- Vercel: https://dashboard-garmin-azure.vercel.app/
- Render: https://dashboard-garmin.onrender.com/

## Despliegue

La aplicación está desplegada tanto en Vercel como en Render y vinculada a este repositorio de GitHub.

El servicio de Render utiliza una instancia gratuita, por lo que puede entrar en suspensión después de periodos de inactividad y presentar demora en la primera solicitud mientras vuelve a iniciar.

## SEO y GEO

La URL canónica del frontend es `https://dashboard-garmin-azure.vercel.app/`.

La capa pública incluye:

- Metadatos SEO (`title`, `description`, `robots` y canonical).
- Open Graph y Twitter Cards para previsualizaciones sociales.
- Datos estructurados JSON-LD con `WebApplication` de Schema.org.
- `robots.txt` y `sitemap.xml` para descubrimiento por buscadores.
- `llms.txt` con contexto público del proyecto para motores generativos.
- Pruebas automatizadas para evitar regresiones en estos archivos.

El contenido autenticado y los datos personales del dashboard no se exponen como contenido indexable. El proyecto se describe como un dashboard independiente y no como un producto oficial de Garmin.

## Rutas del frontend

- `/` — landing pública e indexable del proyecto.
- `/login` — acceso con Garmin Connect y MFA cuando es requerido.
- `/dashboard` — dashboard privado; requiere la sesión local existente.
- `/sources` — fuentes, imports, sincronización, persistencia y readiness.
- `/activities/:id` — Activity Explorer para Garmin.
- `/imported/:id` — Activity Explorer para actividad canónica local/importada.

La landing no consulta la API de Garmin. El contenido personal se mantiene dentro del área autenticada. Vercel usa una reescritura SPA para permitir acceso directo y refresh en las rutas del cliente.
