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
const STATE_FILE = path.join(BACKUP_DIR, "backup_state.json");

const MAX_BACKUPS = 4;
const BACKUP_HOURS = [0, 6, 12, 18];

// Referência do timeout ativo
let timeoutAtivo = null;

// JID real do dono capturado quando ele usa o #backup manual
let ownerJidReal = null;

function setOwnerJid(jid) {
  if (!ownerJidReal) {
    ownerJidReal = jid;
    console.log(`✅ [AutoBackup] JID do dono registrado.`);
  }
}

// ── ESTADO ATIVO/INATIVO ───────────────────────────────────────
function isBackupAtivo() {
  try {
    if (!fs.existsSync(STATE_FILE)) return true; // ativo por padrão
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    return state.ativo !== false;
  } catch (_) {
    return true;
  }
}

function setBackupAtivo(valor) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ativo: valor }));
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
    `⏰[AutoBackup] Próximo backup: ${proxima.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
  );

  timeoutAtivo = setTimeout(async () => {
    if (!isBackupAtivo()) {
      console.log("⏸️  [AutoBackup] Backup desativado, pulando horário.");
    } else {
      console.log(`🕐 [AutoBackup] Iniciando backup das ${new Date().getHours()}:00...`);
      try {
        await runBackup(socket, ownerNumber);
      } catch (e) {
        console.error("❌ [AutoBackup] Falha no backup agendado:", e.message);
      }
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

        if (ownerNumber) {
          await sendBackupToWhatsApp(socket, ownerNumber, info, backupFilePath);
        }

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
        `💡 Arquivo para restauração no servidor.`,
    });

    console.log("📩 [AutoBackup] Arquivo de backup enviado no WhatsApp com sucesso!");
  } catch (e) {
    console.error("❌ [AutoBackup] Falha ao enviar arquivo no WhatsApp:", e.message);
  }
}

// ── INICIA O AGENDADOR ─────────────────────────────────────────
function startAutoBackup(socket, ownerNumber) {
  // Cancela agendador anterior se existir
  if (timeoutAtivo) {
    clearTimeout(timeoutAtivo);
    timeoutAtivo = null;
  }

  const ativo = isBackupAtivo();
  console.log(`📁[AutoBackup] Backup iniciado. Status: ${ativo ? "✅ Ativo" : "⏸️  Inativo"}`);
  agendarProximoBackup(socket, ownerNumber);
}

module.exports = { startAutoBackup, runBackup, setOwnerJid, isBackupAtivo, setBackupAtivo };
