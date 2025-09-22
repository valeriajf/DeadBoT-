const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../database/fig-ban.json");

exports.commands = ["fig-ban-delete"];

exports.handle = async (message, ctx = {}) => {
  const { socket } = ctx || {};
  try {
    if (!socket) {
      console.error("[fig-ban-delete] contexto inválido: socket não fornecido");
      return;
    }

    const chatId = message?.key?.remoteJid;
    if (!chatId) return;

    // 🔒 Verificar se é grupo
    const isGroup = chatId.endsWith("@g.us");
    if (isGroup) {
      const sender = message?.key?.participant || message?.participant || message?.key?.remoteJid;
      const metadata = await socket.groupMetadata(chatId);
      const participants = metadata.participants || [];

      const senderData = participants.find(p => p.id === sender);
      const isAdmin = senderData?.admin === "admin" || senderData?.admin === "superadmin";

      if (!isAdmin) {
        await socket.sendMessage(chatId, { text: "❌ Somente ADMs estão autorizados a usar este comando." }, { quoted: message });
        return;
      }
    }

    if (!fs.existsSync(dbPath)) {
      await socket.sendMessage(chatId, { text: "❌ Nenhuma figurinha cadastrada ainda." }, { quoted: message });
      return;
    }

    const quotedSticker = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage
                        || message?.message?.stickerMessage;
    if (!quotedSticker) {
      await socket.sendMessage(chatId, { text: "❌ Responda a uma figurinha para remover do sistema de ban." }, { quoted: message });
      return;
    }

    const fileSha = quotedSticker.fileSha256;
    if (!fileSha || (fileSha.length === 0)) {
      await socket.sendMessage(chatId, { text: "❌ Não consegui ler o identificador da figurinha." }, { quoted: message });
      return;
    }

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    const raw = fs.readFileSync(dbPath, "utf8");
    const db = raw ? JSON.parse(raw) : { stickers: [] };

    if (!Array.isArray(db.stickers)) db.stickers = [];

    // tenta remover por numericId
    const exists = db.stickers.includes(numericId);
    if (!exists) {
      await socket.sendMessage(chatId, { text: "⚠️ Essa figurinha não está cadastrada." }, { quoted: message });
      return;
    }

    db.stickers = db.stickers.filter(id => id !== numericId);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    await socket.sendMessage(chatId, { text: "🗑️ Figurinha removida com sucesso do sistema de ban!" }, { quoted: message });

  } catch (error) {
    console.error("Erro no comando fig-ban-delete:", error);
    try { await ctx.socket?.sendMessage(message?.key?.remoteJid, { text: "❌ Ocorreu um erro ao remover a figurinha." }); } catch {}
  }
};