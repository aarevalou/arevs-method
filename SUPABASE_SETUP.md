# Configurar Supabase

La aplicación usa Supabase Auth para iniciar sesión y una fila privada por cuenta
administradora para persistir todos los datos de Arevs Method.

## 1. Crear el esquema

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor** en el panel del proyecto.
3. Copia y ejecuta el contenido de [`supabase-schema.sql`](./supabase-schema.sql).

El script crea `public.app_data`, habilita Row Level Security (RLS) y limita
lectura, creación, edición y eliminación a la cuenta autenticada propietaria.
Puede ejecutarse más de una vez.

## 2. Crear la cuenta administradora

En **Authentication → Users**, crea un usuario con el correo y contraseña que
usará el administrador. La aplicación no ofrece registro público. Si la política
del proyecto lo permite, desactiva los registros de usuarios desde la
configuración del proveedor Email.

## 3. Configurar la aplicación

1. Copia `.env.example` a `.env.local` en la raíz del proyecto. En PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Sustituye los valores por **Project URL** y la clave pública **anon** o
   **publishable** de **Project Settings → API**:

   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-publica
   ```

3. Inicia la aplicación:

   ```powershell
   npm run dev
   ```

   Para compilar y abrir la versión de Electron:

   ```powershell
   npm start
   ```

4. Inicia sesión con el usuario creado en Supabase.

No uses ni incluyas `service_role` en `.env.local`, en el frontend ni en una
versión distribuida de Electron. La clave pública se incluye en el cliente; RLS
es lo que impide que una cuenta lea o cambie los datos de otra.

El instalador de Windows se genera con:

```powershell
npm run dist:win
```

El instalador `.exe` aparece en `release/installers`. La compilación incorpora
la URL y la clave pública de `.env.local`; no compartas ese archivo. Como el
proyecto no está firmado con un certificado de publicación, Windows puede
mostrar una advertencia de SmartScreen al instalarlo.

## Persistencia y migración de datos existentes

El esquema guarda el estado de la aplicación en una columna `jsonb`. Esta
estructura preserva el modelo y las reglas CRUD existentes (atletas, asistencia,
pagos, horarios, circuitos, evaluaciones, planes y ajustes) sin dividir la
aplicación en tablas que podrían quedar desincronizadas entre sí.

Al iniciar sesión por primera vez, si la cuenta todavía no tiene una fila, la
aplicación migra una vez el archivo de datos de Electron disponible en ese equipo
y lo borra después de confirmar la carga en Supabase. Si ya existe una fila
remota, esa versión prevalece y el archivo local antiguo se elimina sin
sobrescribir la nube. El navegador también borra su `localStorage` al abrir la
aplicación. Por seguridad, la sesión de Auth se mantiene solo en memoria y hay
que volver a iniciar sesión cada vez que se abre la aplicación. Los cambios
posteriores se guardan en Supabase; los errores de red se muestran y permiten
reintentar el guardado.

La aplicación requiere conexión a Internet para iniciar sesión y sincronizar.
El archivo local se usa como origen de migración inicial, no como réplica
bidireccional ni modo offline.
