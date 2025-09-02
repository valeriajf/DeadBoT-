module.exports = {
    commands: ["afk"],
    description: "Marca você como AFK (ausente)",
    category: "member",
    handle: async (m, { sock, text }) => {
        const fs = require("fs");
        const path = require("path");

        const afkFile = path.resolve(__dirname, "../../afk.json");
        let afkData = {};

        if (fs.existsSync(afkFile)) {
            afkData = JSON.parse(fs.readFileSync(afkFile));
        }

        const sender = m.sender || m.key?.participant || m.key?.remoteJid;
        if (!sender) return;

        const motivo = text || "AFK";
        afkData[sender] = {
            reason: motivo,
            time: Date.now()
        };

        fs.writeFileSync(afkFile, JSON.stringify(afkData, null, 2));

        const mention = "@" + sender.split("@")[0];

        await sock.sendMessage(m.chat, {
            text: `💤 ${mention} agora está AFK.\n📌 Motivo: ${motivo}`,
            mentions: [sender]
        });
    }
};