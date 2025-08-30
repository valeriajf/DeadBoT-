// middlewares/afkMiddleware.js
const { afkData } = require("../commands/member/afk");

async function afkMiddleware(sock, msg) {
  try {
    const m = msg.messages[0];
    if (!m?.message) return;

    const chatId = m.key.remoteJid;

    // Menções na mensagem
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const mentionedJids = contextInfo?.mentionedJid || [];
    if (!mentionedJids.length) return;

    const replies = [];

    for (const jid of mentionedJids) {
      if (afkData[jid]) {
        const { motivo, timestamp } = afkData[jid];

        // Nome do contato (se disponível)
        let nome = jid.split("@")[0];
        try {
          const contact = await sock.onWhatsApp(jid);
          const notify =
            contact?.[0]?.notify || contact?.[0]?.name || contact?.[0]?.canonical;
          if (notify) nome = notify;
        } catch {}

        replies.push(
          `👤 *${nome}* está marcado como AFK!\n🕒 Desde: ${timestamp.toLocaleString()}\nℹ️ Motivo: ${motivo}`
        );
      }
    }

    if (replies.length) {
      await sock.sendMessage(chatId, { text: replies.join("\n\n") }, { quoted: m });
    }
  } catch (e) {
    console.error("Erro no afkMiddleware:", e);
  }
}

module.exports = afkMiddleware;