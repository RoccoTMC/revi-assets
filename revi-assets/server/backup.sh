#!/bin/bash
# REVI Assets — Backup automático diario

BACKUP_DIR="./backups"
DB_FILE="./REVI_ASSETS.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

# Copiar BD con timestamp
cp "$DB_FILE" "$BACKUP_DIR/REVI_ASSETS_${TIMESTAMP}.db"

# Mantener solo últimos 7 backups
find "$BACKUP_DIR" -name "REVI_ASSETS_*.db" -mtime +7 -delete

echo "✅ Backup completado: REVI_ASSETS_${TIMESTAMP}.db"
