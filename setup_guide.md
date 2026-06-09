# Guía de Puesta en Marcha: GitHub, Supabase y Vercel

Sigue estos pasos detallados para subir tu código a GitHub, configurar tu base de datos en Supabase y desplegar la aplicación en Vercel.

---

## 1. Conectar y Subir a GitHub

Tu código local ya está inicializado con Git y tiene el primer commit realizado de forma segura en la rama `main`. Para subirlo a GitHub:

1. Ve a [GitHub](https://github.com/) e inicia sesión.
2. Crea un **nuevo repositorio** (haz clic en el botón "+" arriba a la derecha y selecciona *New repository*).
3. Escribe un nombre para el repositorio (ej. `rv-club-gestion`) y déjalo como Público o Privado.
4. **IMPORTANTE:** No marques las opciones de crear README, `.gitignore` ni Licencia (el proyecto ya tiene todo esto configurado). Haz clic en **Create repository**.
5. Copia la URL de tu repositorio (se verá como `https://github.com/TU_USUARIO/TU_REPOSITORIO.git`).
6. Abre tu terminal de comandos (PowerShell), navega a la carpeta del proyecto y ejecuta estos comandos:
   ```powershell
   # Agrega la URL del repositorio remoto
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

   # Sube los archivos a la rama main
   git push -u origin main
   ```

---

## 2. Configurar la Base de Datos en Supabase

Para inicializar las tablas de base de datos y políticas de seguridad (RLS):

1. Ve al panel de control de [Supabase](https://supabase.com/) y abre tu proyecto.
2. En el menú de la izquierda, haz clic en **SQL Editor** (icono con la palabra `SQL`).
3. Haz clic en **New Query** (Nueva Consulta).
4. Abre el archivo [schema.sql](file:///C:/Users/pnm19/OneDrive/Documents/modelo%20v0/schema.sql) que hemos creado en la raíz de tu proyecto, copia todo su contenido y pégalo en el editor SQL de Supabase.
5. Haz clic en **Run** (Ejecutar) en la esquina inferior derecha.
   - *Verás el mensaje "Success. No rows returned" y se habrán creado las tablas `teams`, `athletes`, `payments`, sembrado el equipo base y activado las políticas RLS.*

---

## 3. Despliegue en Vercel y Variables de Entorno

Una vez que tu código esté en GitHub, puedes desplegar la aplicación en Vercel en menos de 2 minutos:

1. Ve al panel de control de [Vercel](https://vercel.com/) e inicia sesión.
2. Haz clic en **Add New** -> **Project** (Añadir Nuevo -> Proyecto).
3. En la lista de repositorios de GitHub, busca tu repositorio (`rv-club-gestion`) y haz clic en **Import** (Importar).
4. En la sección **Environment Variables** (Variables de Entorno), agrega las siguientes claves:

   | Variable | Fuente |
   |----------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase -> Settings -> API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase -> Settings -> API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase -> Settings -> API (service_role) |
   | `DATABASE_URL` | Supabase -> Database -> Connection string (Pooler) |
   | `GOOGLE_CLIENT_ID` | Google Cloud Console -> Credentials |
   | `GOOGLE_CLIENT_SECRET` | Google Cloud Console -> Credentials |
   | `BETTER_AUTH_URL` | `https://rv-mvp.vercel.app` |
   | `BETTER_AUTH_SECRET` | Generar con `openssl rand -base64 32` |

5. Haz clic en **Deploy** (Desplegar).
   - *Vercel compilará la aplicación y la publicará en la web asignándote un dominio público (ej: `https://rv-club-gestion.vercel.app`).*

---

## 4. Configurar Google Auth

La aplicación usa **Better Auth** (no Supabase Auth) para la autenticación con Google. Sigue estos pasos para configurar las credenciales:

### En Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/), selecciona tu proyecto y ve a **APIs & Services** -> **Credentials**.
2. Crea o edita una **OAuth 2.0 Client ID** (tipo **Web application**).
3. En **Authorized JavaScript origins**, agrega:
   `https://rv-mvp.vercel.app`
4. En **Authorized redirect URIs**, agrega:
   `https://rv-mvp.vercel.app/api/auth/callback/google`

### En Vercel

Agrega las siguientes variables de entorno en Vercel (Settings -> Environment Variables):

| Variable | Descripción |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Client ID de Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google Cloud Console |
| `BETTER_AUTH_URL` | `https://rv-mvp.vercel.app` |
| `BETTER_AUTH_SECRET` | Generar con `openssl rand -base64 32` |
| `DATABASE_URL` | Connection string de Supabase (Pooler) |
