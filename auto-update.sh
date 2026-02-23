#!/bin/bash

PROJECT_DIR="/root/projects/dead-bot"
LOG_FILE="/var/log/dead-bot-update.log"

cd "$PROJECT_DIR" || exit 1

# Busca mudanças sem aplicar
git fetch origin main 2>/dev/null

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Mudanças detectadas. Atualizando..." >> "$LOG_FILE"
    
    git pull origin main >> "$LOG_FILE" 2>&1
    pm2 restart dead-bot >> "$LOG_FILE" 2>&1
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restart concluído." >> "$LOG_FILE"
fi
