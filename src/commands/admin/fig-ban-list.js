const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../database/fig-ban.json");

exports.commands = ["fig-ban-list"];

exports.handle = async (message, ctx = {}) => {
  const { socket } = ctx || {};
  try {
    if (!socket) {
      console.error("[fig-ban-list] contexto inválido: socket não fornecido");
      return;
    }

    const chatId = message?.key?.remoteJid;
    if (!chatId) return;

    if (!fs.existsSync(dbPath)) {
      await socket.sendMessage(chatId, { text: "❌ Nenhuma figurinha cadastrada ainda." }, { quoted: message });
      return;
    }

    const raw = fs.readFileSync(dbPath, "utf8");
    const db = raw ? JSON.parse(raw) : { stickers: [] };
    const stickers = Array.isArray(db.stickers) ? db.stickers : [];

    if (stickers.length === 0) {
      await socket.sendMessage(chatId, { text: "❌ Nenhuma figurinha cadastrada ainda." }, { quoted: message });
      return;
    }

    let listText = `📑 ${stickers.length} figurinha(s) cadastrada(s):\n\n`;
    stickers.forEach((numId, idx) => {
      // converte numeric -> base64 para mostrar também
      try {
        const bytes = numId.split(",").map(n => parseInt(n, 10));
        const buf = Buffer.from(bytes);
        const b64 = buf.toString("base64");
        listText += `${idx + 1}. num: ${numId}\n   b64: ${b64}\n\n`;
      } catch (e) {
        listText += `${idx + 1}. num: ${numId}\n\n`;
      }
    });

    await socket.sendMessage(chatId, { text: listText }, { quoted: message });

  } catch (error) {
    console.error("Erro no comando fig-ban-list:", error);
    try { await ctx.socket?.sendMessage(message?.key?.remoteJid, { text: "❌ Ocorreu um erro ao listar as figurinhas." }); } catch {}
  }
};