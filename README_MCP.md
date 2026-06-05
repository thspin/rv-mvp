# Configuración de Servidores MCP en el Workspace

Hemos configurado un archivo de configuración de MCP local para tu espacio de trabajo en [.cline/mcp.json](file:///.cline/mcp.json).

Este archivo contiene la plantilla para habilitar tres servidores MCP fundamentales en tu flujo de trabajo con Inteligencia Artificial:

1.  **fetch**: Permite al agente de IA leer y analizar páginas web directamente para mantenerse al día con documentación oficial de frameworks y paquetes.
2.  **memory**: Permite al agente recordar información clave y decisiones de diseño a lo largo del tiempo de vida del proyecto.
3.  **postgres**: Permite al agente de IA conectarse a tu base de datos de Supabase para analizar esquemas en caliente, depurar políticas RLS y verificar registros.

---

## 🚀 Cómo activarlo en tu IDE (ej. Cline / Roo Code / Roo Clinic)

La mayoría de extensiones avanzadas de IA detectan de forma automática la presencia del archivo `.cline/mcp.json` en la raíz del espacio de trabajo abierto y cargan los servidores de manera local.

### Configuración del Conector Postgres:

Para que el servidor MCP de Postgres funcione, debes cambiar los placeholders en [.cline/mcp.json](file:///.cline/mcp.json) con tus credenciales de base de datos reales de Supabase:

1. Ve a tu panel de control de [Supabase](https://supabase.com/).
2. Entra a tu proyecto y navega a **Project Settings** -> **Database**.
3. En la sección **Connection string**, selecciona el tab **URI** (o la URL de Pooler en puerto `6543`).
4. Reemplaza la cadena en el archivo con tu URL real:
   ```json
   "postgres": {
     "command": "npx",
     "args": [
       "-y",
       "@modelcontextprotocol/server-postgres",
       "postgresql://postgres:[TU_CONTRASEÑA]@db.[TU_PROYECTO_ID].supabase.co:6543/postgres"
     ]
   }
   ```
   *(Asegúrate de reemplazar `[TU_CONTRASEÑA]` y `[TU_PROYECTO_ID]` con tus valores reales).*

---

## 🛠️ Activación en Claude Desktop (Alternativa Global)

Si utilizas Claude Desktop, puedes copiar estos bloques de configuración dentro de tu archivo global de configuración.

*   **Ruta en Windows (Ejecutar `Win + R` y pegar):**
    `%APPDATA%\Claude\claude_desktop_config.json`
