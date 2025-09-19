const fs = require("fs");
const path = require("path");

exports.commands = ["fig-ban-add"];

exports.handle = async (message, { socket }) => {
    try {
        const chatId = message.key.remoteJid;

        // Só funciona em grupo
        if (!chatId.endsWith("@g.us")) {
            await socket.sendMessage(chatId, { text: "❌ Este comando só pode ser usado em grupos." }, { quoted: message });
            return;
        }

        // Verifica se quem enviou é ADM
        const groupMetadata = await socket.groupMetadata(chatId);
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const sender = message.key.participant || message.key.remoteJid;

        if (!groupAdmins.includes(sender)) {
            await socket.sendMessage(chatId, { text: "❌ Somente ADMs estão autorizados a usar este comando." }, { quoted: message });
            return;
        }

        // Só funciona se for reply a uma figurinha
        if (!message.message.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage) {
            await socket.sendMessage(chatId, { text: "❌ Responda a uma figurinha para adicionar ao banco." }, { quoted: message });
            return;
        }

        const quotedSticker = message.message.extendedTextMessage.contextInfo.quotedMessage.stickerMessage;
        const stickerID = quotedSticker.fileSha256.toString("base64");

        const dbPath = path.join(__dirname, "..", "..", "database", "fig-ban.json");

        let db = { stickers: [] };
        if (fs.existsSync(dbPath)) {
            try {
                db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
            } catch {
                db = { stickers: [] };
            }
        }

        if (!db.stickers.includes(stickerID)) {
            db.stickers.push(stickerID);
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            await socket.sendMessage(chatId, { text: "✅ Figurinha adicionada ao banco com sucesso!" }, { quoted: message });
        } else {
            await socket.sendMessage(chatId, { text: "⚠️ Esta figurinha já está no banco." }, { quoted: message });
        }
    } catch (error) {
        console.error("Erro no comando fig-ban-add:", error);
        await socket.sendMessage(message.key.remoteJid, { text: "❌ Ocorreu um erro ao adicionar a figurinha." });
    }
};