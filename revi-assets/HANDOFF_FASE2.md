# HANDOFF FASE 2 — REVI Assets v2
*Completado: 2026-05-28*

---

## Qué resolvió FASE 2

**Antes:** Cada celular guardaba en su propio IndexedDB. Datos aislados por dispositivo.
**Después:** Todos los celulares en la misma red guardan y leen desde un servidor central SQLite.

---

## Cambios realizados

### 1. Proxy Vite (`vite.config.ts`)
- El frontend llama `/api/...` en vez de `http://IP:3000/api/...`
- Vite reenvía esas llamadas al servidor local en puerto 3000
- Funciona igual desde PC y desde celular en la misma red

### 2. Tipos actualizados (`src/types/index.ts`)
- `id` cambió de `number` a `string` (UUID del servidor)
- Se agregó `tiene_foto` (calculado por servidor)
- Se agregó `FotoMeta` para metadata de fotos

### 3. Nuevo: API Service (`src/services/apiService.ts`)
Capa única que maneja todas las llamadas al servidor:
- `getActivos()` — listar con filtros opcionales
- `getActivo(id)` — detalle con fotos
- `createActivo()` — crear en servidor
- `updateActivo()` — actualizar
- `deleteActivo()` — eliminar
- `uploadFoto()` / `deleteFoto()` — fotos
- `getReportValidation()` — estadísticas
- `syncBatch()` — subir pendientes offline

### 4. Nuevo: Hook online (`src/hooks/useOnline.ts`)
Detecta cambios de conectividad en tiempo real.

### 5. Nuevo: Login (`src/pages/Login.tsx`)
- Pantalla de acceso con logo REVI
- Valida conectividad con el servidor antes de ingresar
- Guarda nombre en localStorage como identidad del operador
- Ruta protegida: sin login no se accede a la app

### 6. Nuevo: Indicador de conexión (`src/components/ConnectionStatus.tsx`)
- Punto verde = servidor conectado
- Punto rojo parpadeando = sin conexión
- Verifica estado cada 30 segundos automáticamente

### 7. Layout actualizado (`src/components/Layout.tsx`)
- Muestra nombre del operador logueado en el header
- Agrega indicador de conexión
- Botón de cerrar sesión (ícono de salida)

### 8. Todas las páginas conectadas al servidor
| Página | Cambio |
|---|---|
| Dashboard | Carga KPIs desde `/api/reports/validation` |
| AssetList | Carga lista desde `/api/activos` con filtros |
| AssetForm | Guarda en `/api/activos` + sube foto al servidor |
| AssetDetail | Carga desde `/api/activos/:id` + fotos |
| AssetLabel | Carga desde API para generar etiqueta QR |
| Reports | Exporta datos reales del servidor a Excel/CSV |

### 9. App.tsx — Rutas protegidas
- Nueva ruta `/login`
- `PrivateRoute`: si no hay usuario en localStorage → redirige a login
- Logout disponible desde el header

---

## Estado del sistema completo

```
Celular / PC  →  http://192.168.1.18:80  (Vite frontend)
                        ↓ proxy
              →  http://localhost:3000   (Express backend)
                        ↓
              →  REVI_ASSETS.db          (SQLite)
```

```
3 ventanas PowerShell necesarias:
  1. cd server && node index.js    → puerto 3000
  2. cd revi-assets && npm run dev → puerto 80
  (3. opcional: cualquier celular en la misma red WiFi)
```

---

## Lo que NO se hizo en FASE 2 (queda para FASE 3)

- Cola offline (guardar localmente si no hay WiFi y sincronizar al volver)
- Migración de datos v1 (IndexedDB → servidor)
- Reportes avanzados con filtros por fecha
- PWA instalable (Service Worker)
- Backup automático de la BD

---

## Archivos creados/modificados en FASE 2

**Creados:**
- `src/services/apiService.ts`
- `src/hooks/useOnline.ts`
- `src/pages/Login.tsx`
- `src/components/ConnectionStatus.tsx`
- `HANDOFF_FASE2.md`

**Modificados:**
- `vite.config.ts` — proxy /api → puerto 3000
- `src/types/index.ts` — id: string, FotoMeta
- `src/App.tsx` — login route + PrivateRoute
- `src/components/Layout.tsx` — usuario + estado conexión
- `src/pages/Dashboard.tsx` — usa API
- `src/pages/AssetList.tsx` — usa API
- `src/pages/AssetForm.tsx` — usa API + sube fotos
- `src/pages/AssetDetail.tsx` — usa API
- `src/pages/AssetLabel.tsx` — usa API
- `src/pages/Reports.tsx` — usa API
