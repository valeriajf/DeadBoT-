const fs = require("fs");
const path = require("path");

const afkFile = path.resolve(__dirname, "../afk.json");

function loadAfk() {
    if (!fs.existsSync(afkFile)) return {};
    return JSON.parse(fs.readFileSync(afkFile));
}

function saveAfk(data) {
    fs.writeFileSync(afkFile, JSON.stringify(data, null, 2));
}

module.exports = async (m, { sock }) => {
    try {
        const textMsg =
            m.message?.extendedTextMessage?.text ||
            m.message?.conversation ||
            "";

        const lower = textMsg.toLowerCase();

        // Ignorar mensagens que são comandos do próprio AFK
        if (lower.startsWith("#afk") || lower.startsWith("#voltei")) {
            return;
        }

        const sender =
            m.sender || m.key?.participant || m.key?.remoteJid;
        if (!sender) return;

        let afkData = loadAfk();

        // Se o usuário está AFK e mandou mensagem → ele voltou
        if (afkData[sender]) {
            const { time, reason } = afkData[sender];
            const duration = ((Date.now() - time) / 1000).toFixed(0);

            delete afkData[sender];
            saveAfk(afkData);

            const mention = "@" + sender.split("@")[0];

            await sock.sendMessage(m.chat, {
                text: `👋 ${mention} voltou!\n⏳ Ficou AFK por ${duration}s\n📌 Motivo: ${reason}`,
                mentions: [sender]
            });
        }

        // Verifica se a mensagem tem menções a alguém
        const mentions =
            m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        for (const jid of mentions) {
            if (afkData[jid]) {
                const { time, reason } = afkData[jid];
                const duration = ((Date.now() - time) / 1000).toFixed(0);
                const mention = "@" + jid.split("@")[0];

                await sock.sendMessage(m.chat, {
                    text: `💤 ${mention} está AFK\n📌 Motivo: ${reason}\n⏰ Desde: ${new Date(time).toLocaleString()}`,
                    mentions: [jid]
                });
            }
        }
    } catch (err) {
        console.error("[AFK Middleware] Erro:", err);
    }
};