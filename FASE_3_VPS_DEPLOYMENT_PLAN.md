# FASE 3 — Plan de Deployment: VPS + Cloudflare Tunnel

**Estado**: 🟢 LISTO PARA IMPLEMENTACIÓN (después de compra de VPS)  
**Fecha Plan**: 2026-06-04  
**Estimación**: 4-6 horas implementación + 2 horas testing

---

## 🎯 Objetivo de FASE 3

Migrar **REVI Assets** de desarrollo local a VPS con acceso seguro vía Cloudflare Tunnel, manteniendo:
- ✅ JWT authentication (FASE 2)
- ✅ SQLite database
- ✅ Offline-first architecture (Dexie)
- ✅ Backup automático
- ✅ 100% compatibilidad con clientes existentes

**NO se toca**: Código de la aplicación, lógica de datos, sincronización

---

## 📋 CHECKLIST PRE-DEPLOYMENT

Antes de ejecutar FASE 3, validar:

- [ ] VPS creado y SSH accesible
- [ ] DNS apuntando a Cloudflare (si tiene dominio)
- [ ] Node.js v18+ instalado en VPS
- [ ] PM2 instalado globalmente (`npm install -g pm2`)
- [ ] Cloudflare account activa
- [ ] Repo en Git clonado en VPS
- [ ] `.env.production` preparado (ver sección Variables)

---

## 🏗️ ARQUITECTURA VPS + CLOUDFLARE TUNNEL

```
┌─────────────────────────────────────────────────────────┐
│           Usuario Final (Navegador)                      │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────────────────┐
│     Cloudflare Tunnel (Seguro, Sin puertos abiertos)    │
│     app.example.com → https://[VPS]:443                 │
└──────────────────┬──────────────────────────────────────┘
                   │ Tunnel encriptado
┌──────────────────▼──────────────────────────────────────┐
│                    VPS (DigitalOcean)                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │ PM2 Process Manager (auto-restart)                 │ │
│  │  ├─ Backend (Node.js) :3000                       │ │
│  │  │  └─ Express + JWT + Rate Limit                 │ │
│  │  │  └─ SQLite REVI_ASSETS.db                      │ │
│  │  │  └─ /api/* (protegido)                         │ │
│  │  │                                                 │ │
│  │  └─ Frontend (SPA build) :5173 (dev) o Nginx      │ │
│  │     └─ React compiled                             │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Backup Automático (Cron)                           │ │
│  │  └─ Diaria 02:00 UTC → REVI_ASSETS_YYYY_MM_DD.db │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 REQUERIMIENTOS DE VPS

### Recomendación Principal: **DigitalOcean Basic Droplet**

| Aspecto | Requisito | Recomendación |
|---------|-----------|---------------|
| CPU | 1+ core | 2x vCPU (más margen) |
| RAM | 512 MB | 2 GB (Node.js + DB + backups) |
| Disco | 20 GB | 50 GB SSD (DB + backups crecen) |
| SO | Linux | Ubuntu 22.04 LTS |
| Red | IPv4 + IPv6 | Sí |
| Ubicación | Cercana a usuarios | Uno de: Miami, São Paulo, Frankfurt |
| Costo | - | **$5-7 USD/mes** (Basic) → **$12/mes** (2GB RAM) |

### Alternativas:
- **Linode**: $5 Nanode (1GB RAM) — budget
- **Hetzner**: €2.99 CPX11 — mejor valor en EU
- **AWS Lightsail**: $3.50 (512MB) — US only

**Recomendación Final**: DigitalOcean $12/mes (2GB) — estable, documentado, simple

---

## 🔧 PASO 1: SETUP INICIAL VPS (30 minutos)

### 1.1 SSH al VPS y actualizar sistema

```bash
# Conectar (reemplazar IP)
ssh root@YOUR_VPS_IP

# Actualizar paquetes
apt update && apt upgrade -y

# Instalar herramientas base
apt install -y curl git htop wget nano ufw

# Configurar firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp        # SSH
ufw allow 80/tcp        # HTTP (Cloudflare)
ufw allow 443/tcp       # HTTPS (Cloudflare)
ufw enable

# Crear usuario no-root (recomendado)
adduser revi
usermod -aG sudo revi
su - revi
```

### 1.2 Instalar Node.js

```bash
# NodeSource repository (v18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node -v    # v18.x.x
npm -v     # 9.x.x
```

### 1.3 Instalar PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Habilitar autostart en reboot
pm2 startup
pm2 save

# Verificar
pm2 -v     # 5.x.x
```

### 1.4 Instalar Cloudflare Tunnel (`cloudflared`)

```bash
# Descargar e instalar
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# Verificar
cloudflared -v    # 2024.x.x
```

---

## 🌐 PASO 2: CLOUDFLARE TUNNEL SETUP (45 minutos)

### 2.1 Crear Tunnel en Cloudflare Dashboard

**Ubicación**: https://dash.cloudflare.com → Zero Trust → Networks → Tunnels

```
1. Click "Create a tunnel"
2. Nombre: "revi-assets-prod"
3. Connector: Linux (selecciona)
4. Copiar comando cloudflared
```

### 2.2 Instalar túnel en VPS

```bash
# Ejecutar el comando de Cloudflare (algo como):
cloudflared service install <TOKEN>

# Verificar
sudo systemctl status cloudflared
```

### 2.3 Configurar rutas en Cloudflare

**En Cloudflare Dashboard**, en la configuración del tunnel, agregar Public Hostnames:

| Subdomain | Type | Origin | Status |
|-----------|------|--------|--------|
| app | HTTPS | localhost:3000 | Active |
| api | HTTPS | localhost:3000 | Active |

O si tienes dominio propio (ej: revi.example.com):

```
Hostname: revi.example.com
Type: HTTPS
Origin: localhost:3000
```

### 2.4 Verificar conexión Tunnel

```bash
# En VPS, verificar que cloudflared está corriendo
systemctl status cloudflared

# Logs
journalctl -u cloudflared -f

# Debe mostrar: "connection established" o "Tunnel registered"
```

---

## 📂 PASO 3: CLONAR Y PREPARAR CÓDIGO (30 minutos)

### 3.1 Clonar repositorio

```bash
# En home de usuario revi
cd /home/revi
git clone https://github.com/TU_USUARIO/REVI-Assets.git  # Reemplazar URL
cd REVI-Assets

# Rama main
git checkout main
```

### 3.2 Instalar dependencias backend

```bash
cd revi-assets/server
npm install

# Verificar instalación
npm list | head -20   # Debe incluir bcryptjs, jsonwebtoken, express-rate-limit
```

### 3.3 Preparar `.env.production`

**Crear archivo** `revi-assets/server/.env.production`:

```bash
# JWT & Security
JWT_SECRET=cambiar-esto-a-algo-muy-largo-y-aleatorio-32-caracteres
NODE_ENV=production
PORT=3000

# CORS (Cloudflare)
CORS_ORIGIN=https://app.cloudflareusercontent.com

# Database
DB_PATH=./REVI_ASSETS.db

# Backup
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/server.log
```

**⚠️ CRÍTICO**: Generar JWT_SECRET aleatorio:

```bash
# En VPS
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiar resultado a .env.production
```

### 3.4 Instalar dependencias frontend

```bash
cd ../
npm install

# Build para producción
npm run build

# Verificar
ls -la dist/   # Debe tener index.html, assets/, etc.
```

### 3.5 Crear `.env.production` frontend

**Crear archivo** `revi-assets/.env.production`:

```bash
VITE_API_URL=https://app.cloudflareusercontent.com/api
```

O si tienes dominio:

```bash
VITE_API_URL=https://revi.example.com/api
```

---

## ⚙️ PASO 4: SETUP BACKEND CON PM2 (20 minutos)

### 4.1 Crear ecosystem.config.js

**Crear archivo** `revi-assets/server/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'revi-assets-api',
      script: './index.js',
      cwd: '/home/revi/REVI-Assets/revi-assets/server',
      env: {
        NODE_ENV: 'production',
        JWT_SECRET: process.env.JWT_SECRET,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        PORT: 3000,
      },
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    }
  ]
};
```

### 4.2 Crear directorio logs

```bash
mkdir -p /home/revi/REVI-Assets/revi-assets/server/logs
chmod 755 /home/revi/REVI-Assets/revi-assets/server/logs
```

### 4.3 Iniciar con PM2

```bash
cd /home/revi/REVI-Assets/revi-assets/server

# Cargar aplicación
pm2 start ecosystem.config.js

# Verificar
pm2 list      # Debe mostrar "revi-assets-api" con status "online"
pm2 logs      # Ver logs en tiempo real

# Salvar configuración PM2
pm2 save
```

---

## 🌐 PASO 5: SERVIR FRONTEND (25 minutos)

### Opción A: Nginx (Recomendado para producción)

```bash
# Instalar Nginx
sudo apt install -y nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/revi-assets
```

**Contenido**:

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name _;
    
    # Servir SPA
    root /home/revi/REVI-Assets/revi-assets/dist;
    index index.html;
    
    # Proxy API al backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (opcional, backend ya maneja)
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PATCH, DELETE, OPTIONS';
    }
    
    location /auth {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
    
    location /health {
        proxy_pass http://localhost:3000;
    }
    
    # SPA routing: todo lo que no es API → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache assets
    location /assets {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/revi-assets /etc/nginx/sites-enabled/

# Quitar default
sudo rm /etc/nginx/sites-enabled/default

# Verificar sintaxis
sudo nginx -t

# Iniciar
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar
sudo systemctl status nginx
```

### Opción B: Servir directamente con Express (más simple)

Modificar `server/index.js` para servir static files:

```javascript
const path = require('path');
const express = require('express');

// ... después de const app = express(); ...

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../dist')));

// ... endpoints de API ...

// SPA fallback (última ruta)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server escuchando en puerto ${PORT}`);
});
```

**Reiniciar PM2**:

```bash
pm2 restart revi-assets-api
```

---

## 🔒 PASO 6: SEGURIDAD & HARDENING (30 minutos)

### 6.1 HTTPS con Let's Encrypt (Cloudflare maneja automaticamente)

Ya está cubierto por Cloudflare Tunnel — no requiere setup adicional.

### 6.2 Validar JWT_SECRET

```bash
# En VPS, verificar .env.production tiene SECRET aleatorio
cat /home/revi/REVI-Assets/revi-assets/server/.env.production | grep JWT_SECRET

# Debe ser 64+ caracteres hexadecimales, NUNCA dev-secret
```

### 6.3 Proteger archivos sensibles

```bash
# Restringir acceso a .env
chmod 600 /home/revi/REVI-Assets/revi-assets/server/.env.production

# Logs solo para revi user
chmod 700 /home/revi/REVI-Assets/revi-assets/server/logs

# DB solo para revi user
chmod 600 /home/revi/REVI-Assets/revi-assets/server/REVI_ASSETS.db

# Backups
chmod 700 /home/revi/REVI-Assets/revi-assets/server/backups
```

### 6.4 Firewall rules

```bash
# SSH solo desde tu IP (recomendado)
sudo ufw delete allow 22/tcp
sudo ufw allow from YOUR_IP to any port 22

# Validar
sudo ufw status
```

---

## 💾 PASO 7: BACKUPS AUTOMÁTICOS (20 minutos)

### 7.1 Crear script de backup mejorado

**Actualizar** `revi-assets/server/backup.sh`:

```bash
#!/bin/bash

# Configuración
BACKUP_DIR="/home/revi/REVI-Assets/revi-assets/server/backups"
DB_FILE="/home/revi/REVI-Assets/revi-assets/server/REVI_ASSETS.db"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/REVI_ASSETS_${TIMESTAMP}.db"
LOG_FILE="/home/revi/REVI-Assets/revi-assets/server/logs/backup.log"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup..." >> "$LOG_FILE"

# Copiar BD
if cp "$DB_FILE" "$BACKUP_FILE" 2>> "$LOG_FILE"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Backup exitoso: $BACKUP_FILE" >> "$LOG_FILE"
    
    # Eliminar backups antiguos
    find "$BACKUP_DIR" -name "REVI_ASSETS_*.db" -mtime +$RETENTION_DAYS -delete
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🧹 Limpieza completada (retención: $RETENTION_DAYS días)" >> "$LOG_FILE"
    
    # Métricas
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    COUNT=$(find "$BACKUP_DIR" -name "REVI_ASSETS_*.db" | wc -l)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📊 Backups disponibles: $COUNT (tamaño último: $SIZE)" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Error en backup" >> "$LOG_FILE"
    exit 1
fi
```

```bash
# Hacer ejecutable
chmod +x /home/revi/REVI-Assets/revi-assets/server/backup.sh
```

### 7.2 Configurar Cron Job

```bash
# Editar crontab
crontab -e

# Agregar línea para backup diario a las 02:00 UTC
0 2 * * * /home/revi/REVI-Assets/revi-assets/server/backup.sh

# Verificar
crontab -l
```

### 7.3 Prueba de backup manual

```bash
# Ejecutar manualmente
/home/revi/REVI-Assets/revi-assets/server/backup.sh

# Verificar
ls -lh /home/revi/REVI-Assets/revi-assets/server/backups/

# Ver logs
tail -20 /home/revi/REVI-Assets/revi-assets/server/logs/backup.log
```

---

## 🧪 PASO 8: TESTING DE PRODUCCIÓN (45 minutos)

### 8.1 Test de conectividad

```bash
# Desde tu máquina local
# 1. Verificar Cloudflare Tunnel está activo (debe mostrar "Healthy")
#    https://dash.cloudflare.com → Networks → Tunnels

# 2. Verificar acceso API
curl -X GET https://app.cloudflareusercontent.com/health
# Respuesta esperada: {"status":"ok","activos":63}

# 3. Login test
curl -X POST https://app.cloudflareusercontent.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
# Respuesta esperada: {"token":"eyJ...","usuario":"Test"}
```

### 8.2 Test de seguridad

```bash
# ❌ Sin token NO funciona
curl -X GET https://app.cloudflareusercontent.com/api/activos
# Respuesta: 401 Unauthorized

# ✅ Con token SÍ funciona
TOKEN=$(curl -s -X POST https://app.cloudflareusercontent.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -X GET https://app.cloudflareusercontent.com/api/activos \
  -H "Authorization: Bearer $TOKEN"
# Respuesta: {"data":[...],"total":63}
```

### 8.3 Test de Rate Limiting

```bash
# Hacer 10 requests fallidos rápido
for i in {1..10}; do
  curl -X POST https://app.cloudflareusercontent.com/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# Request 6+ debe retornar 429 Too Many Requests
```

### 8.4 Test de frontend

1. Abrir en navegador: `https://app.cloudflareusercontent.com`
2. Debe cargar página de Login
3. Crear cuenta con email test
4. Login
5. Ir a Dashboard
6. Crear un Activo offline (desconectar conexión)
7. Reconectar → debe sincronizar
8. Abrir Auditoría → debe mostrar registros con usuario correcto

### 8.5 Test de backup

```bash
# Verificar que backup cron está activo
ls -lah /home/revi/REVI-Assets/revi-assets/server/backups/

# Debe haber múltiples backups con timestamps
```

### 8.6 Test de logs

```bash
# Ver logs de aplicación
pm2 logs revi-assets-api | head -30

# Ver logs de backup
tail -50 /home/revi/REVI-Assets/revi-assets/server/logs/backup.log
```

---

## 📊 PASO 9: MONITOREO Y MANTENIMIENTO (Ongoing)

### 9.1 Dashboards PM2

```bash
# Monitor en tiempo real
pm2 monit

# O ver web dashboard (desarrollo local)
pm2 web
# Visitar http://VPS_IP:9615
```

### 9.2 Verificar Estado

```bash
# Salud de aplicación
curl https://app.cloudflareusercontent.com/health

# Logs de API
pm2 logs revi-assets-api

# Logs de backup
tail -100 /home/revi/REVI-Assets/revi-assets/server/logs/backup.log

# Uso de disco
df -h /

# Uso de memoria
free -h
```

### 9.3 Alertas recomendadas

Configurar en tu infraestructura:

```bash
# Si PM2 process muere
pm2 install pm2-auto-pull
pm2 install pm2-logrotate

# Si disco < 10% disponible
# Alertar al admin

# Si backups no se ejecutan en 24h
# Alertar al admin
```

---

## 🔄 PASO 10: DEPLOYMENT CONTINUO (Opcional)

### 10.1 Auto-update desde Git

**Crear** `update.sh` en home revi:

```bash
#!/bin/bash
cd /home/revi/REVI-Assets
git pull origin main

# Backend
cd revi-assets/server
npm install
pm2 restart revi-assets-api

# Frontend
cd ..
npm install
npm run build

# Restart Nginx
sudo systemctl reload nginx

echo "✅ Deployment completado"
```

```bash
chmod +x /home/revi/update.sh
```

### 10.2 Webhook para Auto-Deploy (GitHub)

**En GitHub Settings → Webhooks**:
- Payload URL: `https://app.cloudflareusercontent.com/webhook/deploy`
- Events: `push` en main

Implementar endpoint en backend si necesitas auto-deploy.

---

## 🚨 PASO 11: TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| Cloudflare Tunnel "disconnected" | `systemctl restart cloudflared` |
| PM2 app "stopped" | `pm2 restart revi-assets-api` |
| 504 Bad Gateway | Ver `pm2 logs`, posible crash de app |
| Backup no funciona | Verificar permisos en /backups, cron logs |
| Frontend no carga | Verificar `npm run build`, Nginx config |
| JWT_SECRET en logs | Cambiar inmediatamente, es una fuga de seguridad |
| Memoria llena | Limitar backups (`find -delete`), reiniciar |

---

## 📋 VARIABLES DE ENTORNO PRODUCCIÓN

### `.env.production` Completo

```bash
# ═══════════════════════════════════════════════════════════
# REVI Assets — Producción
# ═══════════════════════════════════════════════════════════

# Node & Port
NODE_ENV=production
PORT=3000

# JWT Security
JWT_SECRET=<GENERAR CON: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_EXPIRY=7d

# CORS (Cloudflare URL)
CORS_ORIGIN=https://app.cloudflareusercontent.com
# O si tienes dominio:
# CORS_ORIGIN=https://revi.example.com

# Database
DB_PATH=./REVI_ASSETS.db
DB_TIMEOUT=5000

# Backup
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/server.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cloudflare Tunnel
TUNNEL_TOKEN=<desde cloudflared setup>
```

### `.env.production` Frontend

```bash
# ═══════════════════════════════════════════════════════════
# REVI Assets Frontend — Producción
# ═══════════════════════════════════════════════════════════

VITE_API_URL=https://app.cloudflareusercontent.com
# O:
# VITE_API_URL=https://revi.example.com
```

---

## 📈 ESCALA & FUTURO

Si necesitas más de 100 usuarios concurrentes:

1. **Aumentar RAM VPS**: de 2GB a 4GB o más
2. **Pasar a PostgreSQL**: FASE 4 (no incluido)
3. **CDN para assets**: Cloudflare Pages (gratis)
4. **Load Balancer**: Nginx upstream si múltiples servidores
5. **Caché Redis**: Para sessions y rate limiting distribuido

---

## ✅ CHECKLIST FINAL PRE-LANZO

Antes de dar por completo:

- [ ] `pm2 list` muestra revi-assets-api "online"
- [ ] `curl /health` retorna 200
- [ ] Login funciona en https://app.cloudflareusercontent.com
- [ ] Crear activo, logout, login nuevamente — activo persiste
- [ ] Backup script ejecuta sin errores
- [ ] `pm2 logs` no muestra errores críticos
- [ ] Cloudflare Dashboard muestra "Healthy"
- [ ] CORS_ORIGIN es production URL (NO localhost)
- [ ] JWT_SECRET es aleatorio 64+ caracteres (NO dev-secret)
- [ ] `/api/activos` sin token retorna 401
- [ ] Rate limit funciona (6 login fallos = 429)
- [ ] Logs rotan sin llenar disco
- [ ] Respuesta API < 500ms

---

## 🎓 DOCUMENTACIÓN DE REFERENCIA

- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)

---

**FASE 3 PLAN COMPLETADO ✅**

Una vez compres el VPS, ejecuta los pasos 1-11 en orden.
Cada paso tiene verificaciones incorporadas — detente si algo no funciona y diagnostica.

Estimación total: **4-6 horas** (primera vez)
Próximas deployments: **20-30 minutos** (solo git pull → npm install → npm run build)
