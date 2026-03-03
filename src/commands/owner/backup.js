/**
 * 🤖 DEADBOT - Comando de Backup Manual
 * Arquivo: src/commands/owner/backup.js
 *
 * Uso:
 *   #backup         → Cria um backup e envia o arquivo no WhatsApp
 *   #backup status  → Lista os backups salvos
 *
 * @author DeadBot System
 */

const { PREFIX } = require(`${BASE_DIR}/config`);
const { runBackup, setOwnerJid } = require(`${BASE_DIR}/services/autoBackup`);
const fs = require("fs");
const path = require("path");

const BACKUP_DIR = path.resolve(BASE_DIR, "..", "backups");

module.exports = {
  name: "backup",
  description: "Cria um backup do bot e envia o arquivo no WhatsApp",
  commands: ["backup"],
  usage: `${PREFIX}backup | ${PREFIX}backup status`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ args, sendReply, sendSuccessReply, sendErrorReply, sendReact, sendSuccessReact, socket, userJid }) => {
    const subCommand = args[0]?.toLowerCase();

    // ── STATUS ─────────────────────────────────────────────────
    if (subCommand === "status") {
      if (!fs.existsSync(BACKUP_DIR)) {
        return await sendReply("📭 Nenhum backup encontrado ainda.");
      }

      const files = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith("deadbot_backup_") && f.endsWith(".tar.gz"))
        .sort()
        .reverse();

      if (files.length === 0) {
        return await sendReply("📭 Nenhum backup encontrado ainda.");
      }

      let lastInfo = null;
      const lastJsonPath = path.join(BACKUP_DIR, "last_backup.json");
      if (fs.existsSync(lastJsonPath)) {
        try {
          lastInfo = JSON.parse(fs.readFileSync(lastJsonPath, "utf-8"));
        } catch (_) {}
      }

      const lista = files
        .slice(0, 4)
        .map((f, i) => `  ${i + 1}. ${f}`)
        .join("\n");

      const msg =
        `🛡️ *DEADBOT - STATUS DE BACKUPS*\n\n` +
        `📦 *Total salvo:* ${files.length}/4\n` +
        (lastInfo ? `🕐 *Último:* ${lastInfo.timestamp}\n💾 *Tamanho:* ${lastInfo.size}\n` : "") +
        `\n📋 *Arquivos:*\n${lista}\n\n` +
        `_Próximos horários: 00:00 | 06:00 | 12:00 | 18:00_`;

      return await sendReply(msg);
    }

    // ── BACKUP MANUAL ──────────────────────────────────────────
    await sendReact("⏳");
    await sendReply("⏳ Criando backup completo, aguarde...");

    try {
      // Registra o JID real do dono para os backups automáticos
      setOwnerJid(userJid);

      const info = await runBackup(socket, userJid);

      if (!info) {
        return await sendErrorReply("❌ Backup criado, mas não foi possível enviar o arquivo.");
      }

      const agora = new Date();
      const data = agora.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const hora = agora.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });

      await sendSuccessReact();
      await sendSuccessReply(
        `🛡️ *DEADBOT - AUTO-BACKUP*\n\n` +
        `📦 *Arquivo:* ${info.filename}\n` +
        `🕐 *Gerado em:* ${info.timestamp}\n` +
        `💾 *Tamanho:* ${info.size}\n` +
        `📁 *Backups salvos:* ${info.total}/4\n\n` +
        `✅ *Seu arquivo foi enviado com sucesso*\n\n` +
        `📅 ${data}\n` +
        `⏰ ${hora}`
      );
    } catch (error) {
      console.error("[backup.js] Erro:", error);
      await sendReact("❌");
      return await sendErrorReply(
        "❌ Falha ao criar o backup. Verifique o console para mais detalhes."
      );
    }
  },
};
