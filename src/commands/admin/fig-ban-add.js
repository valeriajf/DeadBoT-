const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../database/fig-ban.json");

exports.commands = ["fig-ban-add"];

exports.handle = async (message, ctx = {}) => {
  const { socket } = ctx || {};
  try {
    if (!socket) {
      console.error("[fig-ban-add] contexto inválido: socket não fornecido");
      return;
    }

    const chatId = message?.key?.remoteJid;
    if (!chatId) return;

    // garante arquivo do banco
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({ stickers: [] }, null, 2));
    }

    // aceita: 1) responder a uma figurinha; 2) ou enviar o comando em reply com figurinha direta
    const quotedSticker = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage
                        || message?.message?.stickerMessage;
    if (!quotedSticker) {
      await socket.sendMessage(chatId, { text: "❌ Responda a uma figurinha para adicionar ao sistema de ban." }, { quoted: message });
      return;
    }

    const fileSha = quotedSticker.fileSha256;
    if (!fileSha || (fileSha.length === 0)) {
      await socket.sendMessage(chatId, { text: "❌ Não consegui ler o identificador da figurinha." }, { quoted: message });
      return;
    }

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");
    const base64Id = buf.toString("base64");

    const raw = fs.readFileSync(dbPath, "utf8");
    const db = raw ? JSON.parse(raw) : { stickers: [] };

    if (!Array.isArray(db.stickers)) db.stickers = [];

    if (db.stickers.includes(numericId)) {
      await socket.sendMessage(chatId, { text: "⚠️ Essa figurinha já está cadastrada no sistema de ban." }, { quoted: message });
      return;
    }

    db.stickers.push(numericId);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    await socket.sendMessage(chatId, {
      text: `✅ Figurinha adicionada com sucesso ao sistema de ban!\n\nID numérico:\n${numericId}\n\nID (base64):\n${base64Id}`
    }, { quoted: message });

  } catch (error) {
    console.error("Erro no comando fig-ban-add:", error);
    try { await ctx.socket?.sendMessage(message?.key?.remoteJid, { text: "❌ Ocorreu um erro ao adicionar a figurinha." }); } catch {}
  }
};