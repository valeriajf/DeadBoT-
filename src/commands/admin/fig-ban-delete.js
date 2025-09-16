const fs = require("fs");
const path = require("path");

exports.commands = ["fig-ban-delete"];

exports.handle = async (message, { socket, args }) => {
    try {
        const chatId = message.key.remoteJid;

        if (!chatId.endsWith("@g.us")) {
            await socket.sendMessage(chatId, { text: "❌ Este comando só pode ser usado em grupos." }, { quoted: message });
            return;
        }

        // Verifica se ADM
        const groupMetadata = await socket.groupMetadata(chatId);
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const sender = message.key.participant || message.key.remoteJid;

        if (!groupAdmins.includes(sender)) {
            await socket.sendMessage(chatId, { text: "❌ Somente ADMs estão autorizados a usar este comando." }, { quoted: message });
            return;
        }

        if (!args.length) {
            await socket.sendMessage(chatId, { text: "❌ Informe o ID da figurinha para remover." }, { quoted: message });
            return;
        }

        const stickerID = args[0];
        const dbPath = path.join(__dirname, "..", "..", "database", "fig-ban.json");

        if (!fs.existsSync(dbPath)) {
            await socket.sendMessage(chatId, { text: "⚠️ Nenhuma figurinha cadastrada ainda." }, { quoted: message });
            return;
        }

        let db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
        if (!db.stickers.includes(stickerID)) {
            await socket.sendMessage(chatId, { text: "⚠️ Essa figurinha não está no banco." }, { quoted: message });
            return;
        }

        db.stickers = db.stickers.filter(id => id !== stickerID);
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        await socket.sendMessage(chatId, { text: "✅ Figurinha removida com sucesso!" }, { quoted: message });
    } catch (error) {
        console.error("Erro no comando fig-ban-delete:", error);
        await socket.sendMessage(message.key.remoteJid, { text: "❌ Ocorreu um erro ao remover a figurinha." });
    }
};