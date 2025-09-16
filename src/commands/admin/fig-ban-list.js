const fs = require("fs");
const path = require("path");

exports.commands = ["fig-ban-list"];

exports.handle = async (message, { socket }) => {
    try {
        const chatId = message.key.remoteJid;
        const dbPath = path.join(__dirname, "..", "..", "database", "fig-ban.json");

        if (!fs.existsSync(dbPath)) {
            await socket.sendMessage(chatId, { text: "⚠️ Nenhuma figurinha cadastrada ainda." }, { quoted: message });
            return;
        }

        const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
        if (!db.stickers || !db.stickers.length) {
            await socket.sendMessage(chatId, { text: "⚠️ Nenhuma figurinha cadastrada ainda." }, { quoted: message });
            return;
        }

        const list = db.stickers.map((id, i) => `${i + 1}. ${id}`).join("\n");
        await socket.sendMessage(chatId, { text: `📑 *Lista de Figurinhas Ban*\n\n${list}` }, { quoted: message });
    } catch (error) {
        console.error("Erro no comando fig-ban-list:", error);
        await socket.sendMessage(message.key.remoteJid, { text: "❌ Ocorreu um erro ao listar as figurinhas." });
    }
};