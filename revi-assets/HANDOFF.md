# HANDOFF — REVI Assets
*Estado al 28-05-2026*

---

## ✅ Lo que está construido y funcionando

| Módulo | Estado |
|---|---|
| Formulario 2 pasos con campos REVI | ✅ Funcional |
| Base de datos local (Dexie/IndexedDB) | ✅ Funcional |
| Fotografía con compresión automática | ✅ Funcional |
| Dashboard con KPIs | ✅ Funcional |
| Lista con filtros (Centro de Costo, Estado) | ✅ Funcional |
| Detalle de activo + validación | ✅ Funcional |
| Exportación Excel (.xlsx) y CSV | ✅ Funcional |
| Generación etiqueta QR imprimible | ✅ Funcional |
| Vista pública /ver (cualquier celular) | ✅ Funcional |
| Acceso desde celular vía red WiFi | ✅ Funcional |
| Colores y logo corporativo REVI | ✅ Funcional |

---

## Stack Tecnológico

```
React 18 + Vite + TypeScript
Tailwind CSS 3
Dexie.js (IndexedDB)
react-router-dom v6
react-hook-form + zod
xlsx (SheetJS) — exportación Excel/CSV
browser-image-compression — fotos optimizadas
qrcode.react — generación QR
lucide-react — iconos
```

---

## Cómo arrancar el proyecto

```powershell
# Abrir PowerShell (como Administrador si usas puerto 80)
cd "C:\REVI\PROYECTO APP AF REVI\revi-assets"
npm run dev

# Acceso desde PC
http://localhost:5173

# Acceso desde celular (mismo WiFi)
http://192.168.1.15:5173
```

---

## Estructura del proyecto

```
revi-assets/
├── public/
│   └── logo-revi-cables.jpg        ← Logo REVI
├── src/
│   ├── db/
│   │   └── index.ts                ← Base de datos Dexie (versión 2)
│   ├── types/
│   │   └── index.ts                ← Tipos TypeScript (Activo, Foto, EstadoEquipo)
│   ├── services/
│   │   └── exportService.ts        ← Exportación Excel y CSV
│   ├── components/
│   │   ├── Layout.tsx              ← Header rojo REVI + navegación inferior
│   │   └── StatusBadge.tsx         ← Badge de colores por estado
│   ├── pages/
│   │   ├── Dashboard.tsx           ← KPIs + acceso rápido + recientes
│   │   ├── AssetList.tsx           ← Lista filtrable por estado y centro de costo
│   │   ├── AssetForm.tsx           ← Formulario 2 pasos (nuevo + editar)
│   │   ├── AssetDetail.tsx         ← Ficha detalle + validar + eliminar
│   │   ├── AssetLabel.tsx          ← Etiqueta QR imprimible (Zebra)
│   │   ├── AssetPublicView.tsx     ← Vista pública vía QR (sin base de datos)
│   │   └── Reports.tsx             ← Reportes + exportación
│   ├── App.tsx                     ← Router principal
│   └── index.css                   ← Tailwind + estilos base
├── vite.config.ts                  ← host: 0.0.0.0, port: 5173
├── tailwind.config.js
├── HANDOFF.md                      ← Este archivo
└── package.json
```

---

## Campos del formulario (campos REVI reales)

### Paso 1 — Obligatorios en terreno (30 segundos)
| Campo | Tipo | Opciones |
|---|---|---|
| Centro de Costo | Select | EXTRUSION, INYECCION, MATRICERIA, MOLINO, MANTENIMIENTO, PMP, CALIDAD, INFORMATICA |
| Fecha Inventario | Date | Por defecto: hoy |
| Nombre Equipo | Texto | Libre |
| Área | Select | EXTRUSION, INYECCION, MATRICERIA, MOLINOS, MEZCLA, MANTENCION, CALIDAD, LOGISTICA, COMERCIAL, FINANZAS, ADMINISTRACION, PRODUCCION, INFORMATICA |
| Estado del Equipo | Select | NUEVO, USADO, MAL ESTADO, FUERA DE USO, CHATARRA (DESCARTE) |
| Usuario Registro | Texto | Se guarda automáticamente para la próxima vez |
| Fotografía | Cámara/Galería | Comprimida automáticamente a <80KB |

### Paso 2 — Datos completos (opcional, completar después)
| Campo | Tipo |
|---|---|
| Línea Productiva | Select (PE1-PE3, PVC1-PVC7, REVIFLEX, CANALETAS-REVI) |
| Periféricos | Select (EXTRUSORA, CO EXTRUSORA, CABEZAL, TINAS, JALON, etc.) |
| Layout / Ubicación | Texto libre |
| Marca / Modelo / Año | Texto / Número |
| N° Placa Antiguo (AF) | Texto |
| RAF | Texto |
| Código AF Nuevo | Texto |
| Categoría | Select (EDIFICIOS, MOBILIARIOS, HERRAMIENTAS, MAQUINARIAS, COMPUTADORES, INSTALACIONES Y MEJORAS, OBRAS EN CURSO) |
| Observaciones | Textarea |

---

## Errores encontrados y resoluciones

### 1. Servidor solo escuchaba en IPv6 (`[::1]`)
- **Problema:** Celular no podía conectarse aunque estuviese en el mismo WiFi
- **Causa:** `host: true` insuficiente en Windows
- **Solución:** Cambiar a `host: '0.0.0.0'` en `vite.config.ts`

### 2. QR con texto multilínea — escáneres no navegaban
- **Problema:** QR con bloque de texto era mostrado como texto plano, no como URL
- **Causa:** Error de diseño inicial
- **Solución:** QR contiene SOLO la URL. Info visual en la etiqueta impresa.

### 3. QR URL usaba `localhost` desde PC
- **Problema:** Celular no podía resolver `localhost`
- **Solución:** Sistema de IP guardada en `localStorage` + detección automática de `window.location.origin`

### 4. Data no compartida entre dispositivos
- **Problema:** Al escanear QR desde otro celular, la app cargaba vacía
- **Causa:** Limitación arquitectural — IndexedDB es por dispositivo
- **Solución:** Ruta `/ver?params` embebe los datos del activo en la URL del QR. Funciona en cualquier celular sin base de datos.

### 5. Puerto 5173 no reconocido por escáneres nativos
- **Problema:** Algunos escáneres no navegan URLs con puerto no estándar
- **Solución pendiente:** Cambiar a puerto 80 (ver mejoras pendientes)

---

## Mejoras pendientes — por prioridad

### ALTA — Esta semana
```
1. Cambiar puerto a 80
   Archivo: vite.config.ts → port: 80
   Requiere: PowerShell como Administrador
   Beneficio: QR se abre automáticamente en cualquier escáner sin digitar http://

2. Personalizar listas de Periféricos y Procesos
   Archivo: src/pages/AssetForm.tsx
   Arrays: PERIFERICOS, PROCESOS
   Acción: Reemplazar con valores reales de planta REVI
```

### MEDIA — Próximas 2 semanas
```
3. PWA instalable (Service Worker + manifest.json)
   → App se instala como ícono en el celular
   → Funciona offline sin necesitar URL

4. Backup y restauración
   → Botón "Exportar backup JSON completo"
   → Importar backup en otro dispositivo o al migrar a servidor

5. Dashboard por Centro de Costo
   → Filtrar KPIs por área específica
   → Útil con múltiples operadores

6. Foto múltiple por activo
   → Hasta 4 fotos: placa, general, detalle, ubicación
   → Actualmente: 1 foto por activo
```

### BAJA — Cuando inventario inicial esté completo
```
7. Servidor local en red de planta
   → PC viejo + Node.js + base de datos central compartida
   → Todos los dispositivos ven los mismos datos en tiempo real
   → Estimado: ~3 días de desarrollo

8. Login por usuario
   → Trazabilidad real por operador
   → Control de acceso básico

9. Lector QR integrado en la app
   → Escanear código existente y abrir ficha directamente
   → Requiere: Capacitor + @capacitor/barcode-scanner

10. Sincronización automática con Power BI
    → Requiere servidor central funcionando primero
    → Exportación programada o endpoint REST

11. Impresión masiva de etiquetas
    → Seleccionar múltiples activos y generar todas las etiquetas
    → Útil para etiquetado inicial masivo

12. Control CAPEX y mantenimiento
    → Segunda fase del sistema patrimonial
```

---

## Arquitectura de datos

### Cómo funciona el almacenamiento
```
Dispositivo A (celular operador)
  └── IndexedDB "ReviAssetsDB"
        ├── Tabla: activos   ← todos los registros
        └── Tabla: fotos     ← imágenes comprimidas (base64)

Dispositivo B (otro celular)
  └── IndexedDB "ReviAssetsDB" ← INDEPENDIENTE, no comparte datos
```

### Flujo recomendado hoy (sin servidor)
```
Operador registra en celular A
        ↓
Al terminar jornada → Exportar Excel
        ↓
Subir Excel a carpeta compartida Drive/OneDrive
        ↓
Controller consolida → Power BI / Excel
```

### Campo sync_pendiente
Cada activo tiene `sync_pendiente: true` por defecto.
Este campo está preparado para la futura sincronización con servidor central.
Cuando se implemente el servidor, solo se enviarán los registros con este flag activo.

---

## QR — Cómo funciona

El QR en la etiqueta contiene la URL:
```
http://192.168.1.15:5173/ver?n=NOMBRE&cc=CENTRO&a=AREA&e=ESTADO&r=RAF&af=CODIGO...
```

Al escanear desde cualquier celular (en el mismo WiFi):
- Abre la vista pública `/ver` con los datos del activo
- NO requiere base de datos local en el celular que escanea
- Muestra: nombre, centro de costo, área, línea, marca, modelo, RAF, código AF, fecha

Para que el QR funcione correctamente:
- Abrir la app desde `http://192.168.1.15:5173` (no localhost)
- El celular que escanea debe estar en la misma red WiFi

---

## Notas para el desarrollador

1. La base de datos es **versión 2** en Dexie — si se modifica el schema, incrementar a versión 3
2. Las imágenes se guardan como **base64 comprimido** en IndexedDB — no como archivos separados
3. El campo `usuario_registro` se guarda en `localStorage` como `revi_usuario` para autocompletar
4. La IP del servidor se guarda en `localStorage` como `revi_server_ip` para los QR
5. Los exports usan **SheetJS** — el warning de vulnerabilidad en npm audit es conocido y no afecta uso local
