# REVI Assets v2 — Servidor Backend

## Requisitos
- Node.js 18+
- Mismo PC que tiene la carpeta del proyecto

## Instalación (solo la primera vez)

```powershell
cd "C:\REVI\PROYECTO APP AF REVI\revi-assets\server"
npm install
```

## Arrancar el servidor

```powershell
cd "C:\REVI\PROYECTO APP AF REVI\revi-assets\server"
node index.js
```

El servidor arranca en puerto 3000.
La base de datos se crea automáticamente en: `server/REVI_ASSETS.db`

## Verificar que funciona

Abre en el navegador: http://localhost:3000/health

Debe mostrar:
```json
{
  "status": "ok",
  "version": "2.0.0",
  "activos": 0,
  "db": "REVI_ASSETS.db"
}
```

## Desde celular (mismo WiFi)

```
http://192.168.1.15:3000/health
http://192.168.1.15:3000/api/activos
```

## Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| GET | /health | Estado del servidor |
| GET | /api/activos | Listar activos (con filtros) |
| GET | /api/activos/:id | Detalle de activo + fotos |
| POST | /api/activos | Crear activo |
| PATCH | /api/activos/:id | Actualizar activo |
| DELETE | /api/activos/:id | Eliminar activo |
| GET | /api/activos/:id/fotos | Fotos de un activo |
| POST | /api/activos/:id/fotos | Agregar foto |
| DELETE | /api/fotos/:id | Eliminar foto |
| GET | /api/sync?since= | Sync incremental |
| POST | /api/sync/batch | Subir pendientes locales |
| GET | /api/reports/validation | Reporte de validación |
| GET | /api/auditoria | Historial de cambios |

## Filtros disponibles en GET /api/activos

```
?centro_costo=EXTRUSION
?area=PRODUCCION
?estado=USADO
?validado=false
?search=bomba
```

## Backup de la base de datos

La BD es un solo archivo: `server/REVI_ASSETS.db`
Para hacer backup, simplemente copiar ese archivo a OneDrive/Drive.

## Abrir la BD para inspección

Usar DB Browser for SQLite (gratis):
https://sqlitebrowser.org/dl/
