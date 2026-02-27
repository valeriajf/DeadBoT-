#!/bin/bash
PROJECT_DIR="/root/projects/dead-bot"
LOG_FILE="/var/log/dead-bot-update.log"

cd "$PROJECT_DIR" || exit 1

git fetch origin main 2>/dev/null

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Mudanças detectadas. Atualizando..." >> "$LOG_FILE"
    cp -r database/ /tmp/database-backup
    git reset --hard origin/main >> "$LOG_FILE" 2>&1
    cp -r /tmp/database-backup/. database/
    chmod +x "$PROJECT_DIR/auto-update.sh"
    pm2 restart dead-bot >> "$LOG_FILE" 2>&1
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restart concluído." >> "$LOG_FILE"
fi
