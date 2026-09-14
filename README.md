# dashboard-garmin

Dashboard web para visualización y seguimiento de información relacionada con Garmin.

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
