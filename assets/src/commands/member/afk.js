// commands/member/afk.js
const afkData = {}; // memória local (perde ao reiniciar)

module.exports = {
  commands: ["afk"],
  description: "Marca você como ausente (AFK). Uso: #afk motivo",
  async handle(msgOrCf, ctx = {}) {
    try {
      console.log("✅ Comando AFK foi chamado"); // debug

      const socket = ctx.socket;
      let webMessage = null;
      let chatId;
      let userId;
      let args = ctx.args || [];

      // Chamado com a mensagem original
      if (msgOrCf && msgOrCf.key && msgOrCf.message) {
        webMessage = msgOrCf;
        chatId = webMessage.key.remoteJid;
        userId = webMessage.key.participant || webMessage.key.remoteJid;
      } else if (ctx.commonFunctions) {
        // Chamado via dynamicCommand/commonFunctions
        const cf = ctx.commonFunctions;
        chatId = cf.remoteJid;
        userId = cf.userJid;
      } else {
        // Fallback
        chatId = ctx.chatId;
        userId = ctx.userId;
      }

      // Se não veio args, extrai do texto da mensagem
      if ((!args || args.length === 0) && webMessage) {
        const text =
          webMessage.message?.extendedTextMessage?.text ||
          webMessage.message?.conversation ||
          "";
        const parts = text.trim().split(/\s+/);
        if (parts.length) {
          if (parts[0].startsWith("#") || parts[0].startsWith("/")) parts.shift();
          args = parts;
        }
      }

      const motivo = (args && args.join(" ")) || "Motivo não informado";
      const timestamp = new Date();

      afkData[userId] = { motivo, timestamp };

      const reply =
        `🤖✅ Ausência cadastrada!\n\n🕒 ${timestamp.toLocaleString()}\nℹ️ Motivo: ${motivo}`;

      if (socket && chatId) {
        if (webMessage)
          await socket.sendMessage(chatId, { text: reply }, { quoted: webMessage });
        else
          await socket.sendMessage(chatId, { text: reply });
      }
    } catch (e) {
      console.error("Erro no comando AFK:", e);
      try {
        if (ctx.socket && ctx.chatId)
          await ctx.socket.sendMessage(ctx.chatId, { text: "❌ Erro ao registrar ausência." });
      } catch {}
    }
  },
  // Exporta para o middleware
  afkData,
};