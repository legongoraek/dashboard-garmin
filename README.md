# dashboard-garmin

Dashboard web para visualización y seguimiento de información relacionada con Garmin y otras fuentes de actividad normalizadas a un modelo canónico.

## Validación autónoma local

GitHub Actions no es un requisito ni la fuente de verdad del proyecto. La validación oficial del código se ejecuta desde el propio repositorio y funciona en Windows/Linux con Node.js 22+.

Desde la raíz:

```bash
npm run verify:install
```

Ejecuta instalación reproducible (`npm ci`) en `client` y `server`, seguida de:

- client tests
- client lint
- client build
- server tests

Para iteraciones rápidas sin reinstalar dependencias:

```bash
npm run verify
npm run verify:quick
```

`verify` ejecuta la validación completa usando las dependencias ya instaladas. `verify:quick` ejecuta únicamente tests de client y server.

Con el backend en ejecución se puede validar liveness y readiness básica de providers sin credenciales externas:

```bash
npm run smoke
```

Por defecto usa `http://localhost:4000`. Para otra URL:

```bash
npm run smoke -- --base-url=https://dashboard-garmin.onrender.com
```

También puede definirse `API_BASE_URL`.

Los scripts devuelven exit code distinto de cero ante cualquier fallo, por lo que pueden utilizarse desde PowerShell, CMD, Bash, un IDE, hooks locales o cualquier plataforma de CI/CD. CI/CD es una capa opcional, no un gate necesario para desarrollar o comprobar el proyecto.

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
