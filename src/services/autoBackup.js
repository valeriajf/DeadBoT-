// ================================================================
// 🤖 DEADBOT - AUTO-BACKUP SERVICE
// Arquivo: src/services/autoBackup.js
//
// Agenda backups automáticos: 00:00 | 06:00 | 12:00 | 18:00
// Envia o arquivo .tar.gz no WhatsApp e no Telegram
// ================================================================

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(BASE_DIR, "..");
const BACKUP_SCRIPT = path.join(ROOT_DIR, "backup_deadbot.sh");
const BACKUP_DIR = path.join(ROOT_DIR, "backups");
const LAST_BACKUP_JSON = path.join(BACKUP_DIR, "last_backup.json");

const MAX_BACKUPS = 4;
const BACKUP_HOURS = [0, 6, 12, 18];

// Garante que o agendador só inicia uma única vez
let agendadorIniciado = false;

// JID real do dono capturado quando ele usa o #backup manual
let ownerJidReal = null;

function setOwnerJid(jid) {
  if (!ownerJidReal) {
    ownerJidReal = jid;
    console.log(`✅ [AutoBackup] JID do dono registrado.`);
  }
}

// ── CALCULA MS ATÉ O PRÓXIMO HORÁRIO DE BACKUP (Brasília) ─────
function msParaProximoBackup() {
  const agora = new Date();
  const agoraBrasilia = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const horaAtual = agoraBrasilia.getHours();
  const minutoAtual = agoraBrasilia.getMinutes();
  const segundoAtual = agoraBrasilia.getSeconds();
  const msAtual = agoraBrasilia.getMilliseconds();

  let proximaHora = BACKUP_HOURS.find((h) => h > horaAtual);
  if (proximaHora === undefined) proximaHora = BACKUP_HOURS[0] + 24;

  return (
    (proximaHora - horaAtual) * 60 * 60 * 1000 -
    minutoAtual * 60 * 1000 -
    segundoAtual * 1000 -
    msAtual
  );
}

// ── AGENDADOR RECURSIVO ────────────────────────────────────────
function agendarProximoBackup(socket, ownerNumber) {
  const ms = msParaProximoBackup();
  const proxima = new Date(Date.now() + ms);

  console.log(
    `⏰ [AutoBackup] Próximo backup agendado para: ` +
    `${proxima.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (em ${Math.round(ms / 60000)} minutos)`
  );

  setTimeout(async () => {
    console.log(`🕐 [AutoBackup] Iniciando backup das ${new Date().getHours()}:00...`);
    try {
      await runBackup(socket, ownerNumber);
    } catch (e) {
      console.error("❌ [AutoBackup] Falha no backup agendado:", e.message);
    }
    agendarProximoBackup(socket, ownerNumber);
  }, ms);
}

// ── EXECUTA O SCRIPT DE BACKUP ────────────────────────────────
function runBackup(socket, ownerNumber) {
  return new Promise((resolve, reject) => {
    exec(`bash "${BACKUP_SCRIPT}"`, async (error) => {
      if (error) {
        console.error("❌ [AutoBackup] Erro ao executar backup:", error.message);
        reject(error);
        return;
      }

      console.log("✅ [AutoBackup] Backup concluído com sucesso!");

      try {
        const info = JSON.parse(fs.readFileSync(LAST_BACKUP_JSON, "utf-8"));
        const backupFilePath = path.join(BACKUP_DIR, info.filename);

        // Envia no WhatsApp
        if (ownerNumber) {
          await sendBackupToWhatsApp(socket, ownerNumber, info, backupFilePath);
        }

        // Envia no Telegram
        const { enviarBackupTelegram } = require(`${BASE_DIR}/services/telegramBackup`);
        await enviarBackupTelegram(info, backupFilePath);

        resolve(info);
      } catch (e) {
        console.error("⚠️  [AutoBackup] Erro ao ler/enviar backup:", e.message);
        resolve(null);
      }
    });
  });
}

// ── ENVIA O ARQUIVO NO WHATSAPP ───────────────────────────────
async function sendBackupToWhatsApp(socket, ownerNumber, info, backupFilePath) {
  if (!socket || !ownerNumber) return;

  const { OWNER_LID } = require(`${BASE_DIR}/config`);
  const jid = ownerJidReal || OWNER_LID || (ownerNumber.includes("@")
    ? ownerNumber
    : `${ownerNumber}@s.whatsapp.net`);

  try {
    const fileBuffer = fs.readFileSync(backupFilePath);

    await socket.sendMessage(jid, {
      document: fileBuffer,
      fileName: info.filename,
      mimetype: "application/octet-stream",
      caption:
        `🛡️ *DEADBOT - AUTO-BACKUP*\n\n` +
        `📦 *Arquivo:* ${info.filename}\n` +
        `🕐 *Gerado em:* ${info.timestamp}\n` +
        `💾 *Tamanho:* ${info.size}\n` +
        `📁 *Backups salvos:* ${info.total}/${MAX_BACKUPS}\n\n` +
        `💡 Mantenha este arquivo para restauração rápida em caso de queda da VPS.`,
    });

    console.log("📩 [AutoBackup] Arquivo de backup enviado no WhatsApp com sucesso!");
  } catch (e) {
    console.error("❌ [AutoBackup] Falha ao enviar arquivo no WhatsApp:", e.message);
  }
}

// ── INICIA O AGENDADOR ─────────────────────────────────────────
function startAutoBackup(socket, ownerNumber) {
  if (agendadorIniciado) {
    console.log("⚠️  [AutoBackup] Agendador já está rodando, ignorando nova chamada.");
    return;
  }
  agendadorIniciado = true;
  console.log("🛡️  [AutoBackup] Sistema de backup iniciado.");
  console.log(`   Horários programados: 00:00 | 06:00 | 12:00 | 18:00`);
  agendarProximoBackup(socket, ownerNumber);
}

module.exports = { startAutoBackup, runBackup, setOwnerJid };
