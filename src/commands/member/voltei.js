module.exports = {
    commands: ["voltei"],
    description: "Marca você como de volta (remove AFK)",
    category: "member",
    handle: async (m, { sock }) => {
        const fs = require("fs");
        const path = require("path");

        const afkFile = path.resolve(__dirname, "../../afk.json");
        if (!fs.existsSync(afkFile)) return;

        let afkData = JSON.parse(fs.readFileSync(afkFile));

        const sender = m.sender || m.key?.participant || m.key?.remoteJid;
        if (!sender) return;

        if (!afkData[sender]) {
            return sock.sendMessage(m.chat, {
                text: "⚠️ Você não está marcado como AFK."
            });
        }

        const { time } = afkData[sender];
        const duration = ((Date.now() - time) / 1000).toFixed(0);

        delete afkData[sender];
        fs.writeFileSync(afkFile, JSON.stringify(afkData, null, 2));

        const mention = "@" + sender.split("@")[0];

        await sock.sendMessage(m.chat, {
            text: `👋 ${mention} voltou!\n⏳ Ficou AFK por ${duration}s`,
            mentions: [sender]
        });
    }
};