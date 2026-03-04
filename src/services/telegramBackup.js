// ================================================================
// 🤖 DEADBOT - TELEGRAM BACKUP SERVICE
// Arquivo: src/services/telegramBackup.js
//
// Envia o backup .tar.gz direto no Telegram após cada backup
// Usa apenas módulos nativos do Node.js (sem dependências extras)
// ================================================================

const https = require("https");
const fs = require("fs");
const path = require("path");

const TELEGRAM_TOKEN = "8332041897:AAFmMaKpVc5M8cx39rdnPcKnPMvxnMKcO2g";
const TELEGRAM_CHAT_ID = "7166593751";

// ── ENVIA O ARQUIVO .tar.gz NO TELEGRAM ───────────────────────
async function enviarBackupTelegram(info, backupFilePath) {
  try {
    if (!fs.existsSync(backupFilePath)) {
      console.error("❌ [TelegramBackup] Arquivo não encontrado:", backupFilePath);
      return;
    }

    const fileBuffer = fs.readFileSync(backupFilePath);
    const boundary = "----DeadBotBackup" + Date.now();

    const caption =
      `🛡️ DEADBOT - AUTO-BACKUP\n\n` +
      `📦 Arquivo: ${info.filename}\n` +
      `🕐 Gerado em: ${info.timestamp}\n` +
      `💾 Tamanho: ${info.size}\n` +
      `📁 Backups salvos: ${info.total}/4\n\n` +
      `💡 Arquivo para restauração no servidor.`;

    // Monta o multipart/form-data manualmente
    const bodyParts = [];

    bodyParts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="chat_id"\r\n\r\n` +
      `${TELEGRAM_CHAT_ID}\r\n`
    );

    bodyParts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="caption"\r\n\r\n` +
      `${caption}\r\n`
    );

    const fileHeader =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="document"; filename="${info.filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`;

    const fileFooter = `\r\n--${boundary}--\r\n`;

    const body = Buffer.concat([
      Buffer.from(bodyParts.join("")),
      Buffer.from(fileHeader),
      fileBuffer,
      Buffer.from(fileFooter),
    ]);

    await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.telegram.org",
        path: `/bot${TELEGRAM_TOKEN}/sendDocument`,
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const result = JSON.parse(data);
          if (result.ok) {
            console.log("📨 [TelegramBackup] Arquivo enviado no Telegram com sucesso!");
            resolve(result);
          } else {
            console.error("❌ [TelegramBackup] Erro da API:", result.description);
            reject(new Error(result.description));
          }
        });
      });

      req.on("error", reject);
      req.write(body);
      req.end();
    });

  } catch (e) {
    console.error("❌ [TelegramBackup] Falha ao enviar no Telegram:", e.message);
  }
}

module.exports = { enviarBackupTelegram };
