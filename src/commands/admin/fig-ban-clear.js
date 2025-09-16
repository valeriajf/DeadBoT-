const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../database/fig-ban.json");

exports.commands = ["fig-ban-clear"];

exports.handle = async (message, ctx = {}) => {
  const { socket } = ctx || {};
  try {
    if (!socket) {
      console.error("[fig-ban-clear] contexto inválido: socket não fornecido");
      return;
    }

    const chatId = message?.key?.remoteJid;
    if (!chatId) return;

    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({ stickers: [] }, null, 2));
    } else {
      fs.writeFileSync(dbPath, JSON.stringify({ stickers: [] }, null, 2));
    }

    await socket.sendMessage(chatId, { text: "🧹 Todas as figurinhas de ban foram apagadas com sucesso!" }, { quoted: message });

  } catch (error) {
    console.error("Erro no comando fig-ban-clear:", error);
    try { await ctx.socket?.sendMessage(message?.key?.remoteJid, { text: "❌ Ocorreu um erro ao limpar as figurinhas." }); } catch {}
  }
};