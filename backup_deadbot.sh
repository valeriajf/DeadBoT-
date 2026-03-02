#!/bin/bash
# ================================================================
# 🤖 DEADBOT - SISTEMA DE AUTO-BACKUP COMPLETO
# Horários: 00:00 | 06:00 | 12:00 | 18:00
# ================================================================

BOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$BOT_DIR/backups"
MAX_BACKUPS=4
LOG_FILE="$BACKUP_DIR/backup.log"
TIMESTAMP=$(TZ='America/Sao_Paulo' date '+%Y%m%d_%H%M%S')
BACKUP_NAME="deadbot_backup_${TIMESTAMP}.tar.gz"

log() {
  echo "[$(TZ='America/Sao_Paulo' date '+%d/%m/%Y %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

mkdir -p "$BACKUP_DIR"
log "🚀 Iniciando backup completo: $BACKUP_NAME"
log "📂 Raiz do bot: $BOT_DIR"

cd "$BOT_DIR" || { log "❌ ERRO: Não foi possível acessar $BOT_DIR"; exit 1; }

tar -czf "$BACKUP_DIR/$BACKUP_NAME" \
  --exclude="./node_modules" \
  --exclude="./.git" \
  --exclude="./backups" \
  --exclude="./*.tar.gz" \
  --exclude="./*.log" \
  . 2>>"$LOG_FILE"

if [ $? -eq 0 ]; then
  SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
  log "✅ Backup criado! Tamanho: $SIZE"
else
  log "❌ ERRO ao criar o backup!"
  exit 1
fi

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/deadbot_backup_*.tar.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
  ls -1t "$BACKUP_DIR"/deadbot_backup_*.tar.gz | tail -n "$DELETE_COUNT" | while read -r old; do
    rm "$old"
    log "🗑️  Removido: $(basename "$old")"
  done
fi

TOTAL=$(ls -1 "$BACKUP_DIR"/deadbot_backup_*.tar.gz 2>/dev/null | wc -l)
log "📦 Backups salvos: $TOTAL/$MAX_BACKUPS"
log "✔️  Concluído: $BACKUP_NAME"
log "───────────────────────────────────────────────"

cat > "$BACKUP_DIR/last_backup.json" << EOF
{
  "filename": "$BACKUP_NAME",
  "timestamp": "$(TZ='America/Sao_Paulo' date '+%d/%m/%Y às %H:%M:%S')",
  "size": "$SIZE",
  "total": $TOTAL
}
EOF

exit 0
