# Guía — dashboard-garmin

Tres cosas distintas, cada una en su sección:

1. [Activar lo que hoy está bloqueado](#1-activar-lo-que-hoy-está-bloqueado) — Strava, Garmin Developer Program, PostgreSQL/PostGIS.
2. [Usar el dashboard ya desplegado](#2-usar-el-dashboard-ya-desplegado) — cómo entrar y qué hace cada pantalla.
3. [Desplegar desde cero](#3-desplegar-desde-cero) — clonar el repo y levantarlo en local o en un hosting nuevo.
4. [Renovar el login de Garmin cuando Render se bloquea](#4-renovar-el-login-de-garmin-cuando-render-se-bloquea) — receta de ~5 minutos, sin código nuevo.

Los bloqueos activos están registrados con evidencia en [PENDIENTES.md](PENDIENTES.md) (P-001, P-002, P-003, P-005, P-006). Esta guía es el "cómo" de esos puntos.

---

## 1. Activar lo que hoy está bloqueado

### 1.1 Strava (P-001)

1. Entra a [strava.com/settings/api](https://www.strava.com/settings/api) y crea una aplicación (necesitas una cuenta Strava).
2. Strava te da un **Client ID** y un **Client Secret**.
3. En **Authorization Callback Domain**, pon el dominio del backend (sin `https://` ni ruta), por ejemplo `dashboard-garmin.onrender.com`.
4. Define estas variables de entorno en el backend (Render → tu servicio → *Environment*):
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_REDIRECT_URI` — debe ser la URL completa y **coincidir exactamente** con lo que Strava espera: `https://<tu-backend>/api/strava/oauth/callback`.
5. Redeploy del backend para que tome las variables nuevas.
6. Verifica sin conectar nada todavía:
   ```bash
   curl https://<tu-backend>/api/providers
   ```
   `providers.strava.configured` debe pasar a `true`.
7. Conecta tu cuenta: entra al dashboard → `/sources` → botón de conectar Strava. Eso dispara `GET /api/strava/oauth/start`, te redirige a Strava a autorizar, y Strava vuelve al callback del backend, que guarda el token en una cookie `strava_tokens` (HttpOnly) y te regresa a `/sources?strava=connected`.
8. Cierra P-005 para Strava: confirma que `/sources` trae actividades reales y anota el resultado en `PENDIENTES.md`.

### 1.2 Garmin Developer Program oficial (P-002)

1. Solicita acceso en [developer.garmin.com/gc-developer-program](https://developer.garmin.com/gc-developer-program/overview/). Esto es una aprobación manual de Garmin — puede tardar y no depende de este repo.
2. **Importante — límite real de lo que hay hecho:** el código de este repo solo trae el *boundary* canonical y la bandera de readiness (`server/providerReadiness.js`), leyendo `GARMIN_DEVELOPER_APPROVED`, `GARMIN_DEVELOPER_CLIENT_ID` y `GARMIN_DEVELOPER_CLIENT_SECRET`. No existe todavía ningún cliente que llame a la API oficial de Garmin — se decidió no inventar endpoints/auth antes de tener la aprobación real (regla fija en `AGENTS.md`/`CLAUDE.md`).
3. Cuando Garmin apruebe y entregue credenciales:
   - Define `GARMIN_DEVELOPER_APPROVED=true`, `GARMIN_DEVELOPER_CLIENT_ID`, `GARMIN_DEVELOPER_CLIENT_SECRET` en el backend.
   - `GET /api/providers` mostrará `providers.garmin_official.configured: true`.
   - Falta implementar el cliente real contra la API de Garmin (OAuth, endpoints, normalización al modelo canonical) — es trabajo de código nuevo, regístralo en `PENDIENTES.md` como punto separado cuando llegue ese momento.

### 1.3 PostgreSQL/PostGIS (P-003)

1. Provisiona una instancia Postgres con la extensión **PostGIS** disponible (Render Postgres, Supabase, Neon, etc. — cualquiera que permita `CREATE EXTENSION postgis`).
2. Toma la cadena de conexión y defínela en el backend como `DATABASE_URL`.
   - Opcionales: `PGSSL=disable` o `PGSSLMODE=disable` si tu proveedor no usa TLS; `PGPOOL_MAX`, `PG_IDLE_TIMEOUT_MS`, `PG_CONNECT_TIMEOUT_MS` para ajustar el pool (`server/postgresRuntime.js`).
3. Corre la migración (desde tu máquina, apuntando a la DB real vía `DATABASE_URL` en el entorno donde ejecutes el comando):
   ```bash
   cd server
   npm ci
   DATABASE_URL="postgres://..." npm run migrate:analytics
   ```
   Aplica `server/migrations/001_analytics_postgis.sql` y confirma la versión de PostGIS instalada.
4. Redeploy del backend con `DATABASE_URL` ya configurada.
5. Verifica:
   ```bash
   curl https://<tu-backend>/api/providers/postgres/health
   ```
   `200` con `ok: true` si quedó bien conectada.
6. Hasta que esto no esté activo, el dashboard sigue funcionando con IndexedDB en el navegador (comportamiento actual, cero-infra).

---

## 2. Usar el dashboard ya desplegado

- Frontend: https://dashboard-garmin-azure.vercel.app/
- Backend: https://dashboard-garmin.onrender.com/ (plan gratuito de Render — si nadie lo usó en un rato, la primera petición tarda mientras el servicio despierta)

Flujo:

1. Entra al frontend. `/` es la landing pública; no pide login.
2. **Login** (`/login`): tu email y password de Garmin Connect (cuenta personal, no la oficial de developer). Si tu cuenta tiene MFA activo, aparece un segundo campo para el código que Garmin te manda por correo.
   - Garmin bloquea temporalmente los intentos de login cuando detecta muchos requests desde la misma IP en poco tiempo (más común desde IPs de datacenter como Render) — si ves un error de "bloqueado temporalmente", espera unos minutos y reintenta. No es un bug de la app.
3. **`/dashboard`**: resumen diario, sueño, HRV, entrenamientos, y el heatmap de rutas (`TrainingHeatmap`), construido sobre datos ya sincronizados/persistidos.
4. **`/sources`**: conectar Strava (ver sección 1.1), importar archivos `.fit`/`.gpx`, ver estado de sincronización y de persistencia (IndexedDB local vs PostgreSQL si ya está activo), y hacer backup/restaurar/borrar tus datos locales.
5. **`/activities/:id`**: Activity Explorer para una actividad de Garmin (ruta, elevación, FC, velocidad, cadencia, potencia según disponibilidad).
6. **`/imported/:id`**: mismo explorador para una actividad importada/canónica local (Strava, FIT, GPX, Komoot).

Datos sensibles (GPS exacto, biometría, recovery) se quedan en el área autenticada; la landing pública no los expone ni los consulta.

---

## 3. Desplegar desde cero

### 3.1 Requisitos

- Node.js 22+
- [Bun](https://bun.sh) — solo lo usa el CLI legacy de Garmin (`ai-skill-garmin/skills/garmin-connect/scripts/garmin.ts`), que es un único archivo sin dependencias npm propias, así que basta con tener el runtime instalado.
- Git

### 3.2 Clonar

```bash
git clone https://github.com/legongoraek/dashboard-garmin.git
cd dashboard-garmin
```

`ai-skill-garmin/` es un repo público de otro autor (`dsebastien/ai-skill-garmin`) vendorizado dentro de este proyecto — no es necesario clonarlo aparte, ya viene con el checkout.

### 3.3 Correr en local

```bash
# backend
cd server
npm ci
npm run dev          # http://localhost:4000

# frontend, en otra terminal
cd client
npm ci
npm run dev           # http://localhost:5173
```

Sin variables de entorno adicionales ya funciona: Garmin legacy (login con tu cuenta personal), FIT/GPX/Komoot por import de archivo, y persistencia en IndexedDB del navegador. Strava, Garmin oficial y Postgres quedan con su readiness en `false` hasta que configures lo de la sección 1.

Para validar que todo el workspace está sano antes de tocar nada:

```bash
npm run verify:install   # desde la raíz del repo
```

### 3.4 Desplegar (mismo patrón que la instancia actual: Render + Vercel)

**Backend en Render:**
1. New → Web Service, apuntando a este repo.
2. Root directory: `server`.
3. Build command: `npm ci`.
4. Start command: `npm start`.
5. Variables de entorno mínimas:
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://<tu-frontend-en-vercel>` (para CORS y para el redirect post-OAuth de Strava)
   - Las de la sección 1 según qué actives.
6. Render asigna `PORT` automáticamente; el backend ya lo respeta (`server/index.js`).

**Frontend en Vercel:**
1. Import Project apuntando a este repo.
2. Root directory: `client`.
3. Framework: Vite (autodetectado). Build command `npm run build`, output `dist`.
4. Variable de entorno: `VITE_GARMIN_API_URL=https://<tu-backend-en-render>/api` — el cliente por defecto pega a `/api` relativo, que solo funciona si frontend y backend comparten dominio; como Vercel y Render son dominios distintos, esta variable es obligatoria.
5. El `vercel.json` del repo ya trae el rewrite SPA (`/(.*) → /index.html`) para que las rutas del cliente (`/dashboard`, `/activities/:id`, etc.) funcionen con refresh directo.

**Después de desplegar**, corre el smoke contra la instancia real:

```bash
npm run smoke -- --base-url=https://<tu-backend-en-render>
```

---

## 4. Renovar el login de Garmin cuando Render se bloquea

Contexto ([P-006](PENDIENTES.md)): Garmin bloquea el login completo (con MFA) cuando viene de una IP de datacenter como la de Render. Esto **solo pasa en el login inicial** — una vez logueado, la sesión se renueva sola sin MFA por ~1 año (`ai-skill-garmin/skills/garmin-connect/scripts/garmin.ts:29-31`), así que en el día a día producción funciona normal. Esta receta solo hace falta cuando ese año se cumple y el login vuelve a fallar en producción con `429`/`OAuth1 exchange failed`.

No hay forma de evitar que ese primer login corra desde tu máquina — es la IP la que Garmin bloquea, no el código, y ninguna solución gratis/sin cambiar de hosting lo evita. Lo que sí es simple es pasar la sesión ya lograda a producción, sin nada que instalar ni mantener:

1. En tu máquina, levanta el proyecto en local (ver [sección 3.3](#33-correr-en-local)):
   ```bash
   cd server && npm run dev    # puerto 4000
   cd client && npm run dev    # puerto 5173, en otra terminal
   ```
2. Entra a `http://localhost:5173/login` y haz login con tu cuenta Garmin (con MFA si te lo pide). Como corre desde tu IP, no desde Render, no se bloquea.
3. Con la pestaña de `localhost:5173` abierta, abre DevTools → pestaña **Application** (Chrome/Edge) o **Storage** (Firefox) → **Cookies** → `http://localhost:5173`. Busca la cookie `garmin_tokens` y copia su **Value** completo (es un JSON largo).
4. Abre el dashboard real: `https://dashboard-garmin-azure.vercel.app/`. DevTools → Application → Cookies → `https://dashboard-garmin.onrender.com`. Click derecho → **Add** (o el botón `+`) y crea una cookie:
   - **Name**: `garmin_tokens`
   - **Value**: pega lo que copiaste en el paso 3
   - **Domain**: `dashboard-garmin.onrender.com`
   - **Path**: `/`
   - **Secure**: ✓
   - **SameSite**: `None`
5. En la misma pestaña de producción, abre la consola de DevTools y corre:
   ```js
   localStorage.setItem("garmin_session", "true")
   ```
6. Recarga `https://dashboard-garmin-azure.vercel.app/dashboard`. Debería cargar tus datos sin pedir login.

Si en el futuro esto se vuelve más frecuente que una vez al año (por ejemplo, si el refresco automático también empieza a fallar desde Render), avisa para reconsiderar — ahí sí valdría la pena algo más automatizado.
