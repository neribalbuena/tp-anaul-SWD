# Sistema web de catálogo de compras

El catálogo lee los productos de `public.productos` en Supabase y genera URLs firmadas para las imágenes almacenadas en el bucket privado `prod-img`.

## Configuración

1. Entra en `front` y copia `.env.example` a `.env`.
2. Completa estas variables en `.env`:
   - `DATABASE_URL`: cadena de conexión PostgreSQL del pooler de Supabase.
   - `SUPABASE_URL`: URL del proyecto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: clave de servidor de Supabase, necesaria para firmar las URLs de Storage.
   - `ADMIN_PASSWORD`: define una contraseña fuerte para autorizar el alta de productos. Sin ella, la aplicación permite consultar el catálogo, pero no guardar productos.
   - `PORT` (opcional): puerto HTTP; por defecto es `3000`.

   La conexión PostgreSQL exige TLS, pero no valida el certificado del servidor para admitir la cadena de certificados del pooler. Esto cifra el tráfico, aunque no protege frente a un intermediario que suplante el servidor; en entornos donde esté disponible el certificado CA correcto, es preferible validarlo.
3. Instala dependencias y ejecuta la aplicación:

   ```powershell
   npm install
   npm start
   ```

La tabla debe tener las columnas `id`, `nombre`, `descripcion`, `precio`, `stock` e `imagen_url`. Para las imágenes se admiten URLs del panel de Supabase con el parámetro `preview` (por ejemplo, `preview=Bebida.png`) y URLs de objeto de Storage del bucket `prod-img`.

El bucket se mantiene privado: el servidor firma cada URL por una hora y envía solo esa URL temporal a la página. Nunca uses la clave `SUPABASE_SERVICE_ROLE_KEY` en el navegador ni la subas al repositorio. El archivo `.env` está excluido de Git.

El catálogo consulta los productos de esa tabla desde `/productos`. El panel `/admin/productos` permite listar, crear, editar y eliminar productos. El campo de imagen es opcional; si se completa, debe apuntar a un objeto del bucket privado `prod-img`.

El alta y los cambios desde el panel requieren la contraseña configurada en `ADMIN_PASSWORD`. Usa la aplicación detrás de HTTPS cuando esté publicada para proteger esa contraseña durante el envío del formulario.
