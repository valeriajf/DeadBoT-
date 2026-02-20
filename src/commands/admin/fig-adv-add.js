const fs = require("fs");
const path = require("path");

exports.commands = ["fig-adv-add"];

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

        if (!message.message.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage) {
            await socket.sendMessage(chatId, { text: "❌ Responda a uma figurinha para adicionar ao sistema de advertência." }, { quoted: message });
            return;
        }

        const quotedSticker = message.message.extendedTextMessage.contextInfo.quotedMessage.stickerMessage;
        const fileSha = quotedSticker.fileSha256;

        if (!fileSha || fileSha.length === 0) {
            await socket.sendMessage(chatId, { text: "❌ Não consegui ler o identificador da figurinha." }, { quoted: message });
            return;
        }

        const buf = Buffer.from(fileSha);
        const numericId = Array.from(buf).join(",");

        const dbPath = path.join(__dirname, "..", "..", "database", "fig-adv.json");

        let db = { stickers: [] };
        if (fs.existsSync(dbPath)) {
            try {
                db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
            } catch {
                db = { stickers: [] };
            }
        }

        if (!Array.isArray(db.stickers)) db.stickers = [];

        if (!db.stickers.includes(numericId)) {
            db.stickers.push(numericId);
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            await socket.sendMessage(chatId, { text: "✅ Figurinha de advertência adicionada ao banco com sucesso!" }, { quoted: message });
        } else {
            await socket.sendMessage(chatId, { text: "⚠️ Esta figurinha já está no banco de advertências." }, { quoted: message });
        }
    } catch (error) {
        console.error("Erro no comando fig-adv-add:", error);
        await socket.sendMessage(message.key.remoteJid, { text: "❌ Ocorreu um erro ao adicionar a figurinha." });
    }
};
