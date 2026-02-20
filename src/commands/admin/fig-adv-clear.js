const fs = require("fs");
const path = require("path");

exports.commands = ["fig-adv-clear"];

exports.handle = async (message, { socket }) => {
    try {
        const chatId = message.key.remoteJid;

        if (!chatId.endsWith("@g.us")) {
            await socket.sendMessage(chatId, { text: "❌ Este comando só pode ser usado em grupos." }, { quoted: message });
            return;
        }

        const groupMetadata = await socket.groupMetadata(chatId);
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const sender = message.key.participant || message.key.remoteJid;

        if (!groupAdmins.includes(sender)) {
            await socket.sendMessage(chatId, { text: "❌ Somente ADMs estão autorizados a usar este comando." }, { quoted: message });
            return;
        }

        const dbPath = path.join(__dirname, "..", "..", "database", "fig-adv.json");

        if (!fs.existsSync(dbPath)) {
            await socket.sendMessage(chatId, { text: "⚠️ Nenhuma figurinha de advertência cadastrada ainda." }, { quoted: message });
            return;
        }

        fs.writeFileSync(dbPath, JSON.stringify({ stickers: [] }, null, 2));

        await socket.sendMessage(chatId, { text: "✅ Todas as figurinhas de advertência foram removidas do banco." }, { quoted: message });
    } catch (error) {
        console.error("Erro no comando fig-adv-clear:", error);
        await socket.sendMessage(message.key.remoteJid, { text: "❌ Ocorreu um erro ao limpar o banco de figurinhas de advertência." });
    }
};
