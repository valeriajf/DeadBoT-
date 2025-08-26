// commands/member/voltei.js
const { afkData } = require("./afk");

module.exports = {
  commands: ["voltei"],
  description: "Remove status AFK. Uso: #voltei",
  async handle(msgOrCf, ctx = {}) {
    try {
      const socket = ctx.socket;
      let webMessage = null;
      let chatId;
      let userId;

      if (msgOrCf && msgOrCf.key && msgOrCf.message) {
        webMessage = msgOrCf;
        chatId = webMessage.key.remoteJid;
        userId = webMessage.key.participant || webMessage.key.remoteJid;
      } else if (ctx.commonFunctions) {
        const cf = ctx.commonFunctions;
        chatId = cf.remoteJid;
        userId = cf.userJid;
      } else {
        chatId = ctx.chatId;
        userId = ctx.userId;
      }

      if (!userId) {
        if (socket && chatId)
          await socket.sendMessage(
            chatId,
            { text: "❌ Não foi possível identificar o usuário." },
            { quoted: webMessage }
          );
        return;
      }

      if (afkData[userId]) {
        delete afkData[userId];
        const reply = "🤖👋 Bem-vindo de volta! Sua ausência foi removida.";
        if (socket && chatId) {
          if (webMessage)
            await socket.sendMessage(chatId, { text: reply }, { quoted: webMessage });
          else
            await socket.sendMessage(chatId, { text: reply });
        }
      } else {
        if (socket && chatId)
          await socket.sendMessage(
            chatId,
            { text: "⚠️ Você não está marcado como ausente." },
            { quoted: webMessage }
          );
      }
    } catch (e) {
      console.error("Erro no comando Voltei:", e);
      try {
        if (ctx.socket && ctx.chatId)
          await ctx.socket.sendMessage(ctx.chatId, { text: "❌ Erro ao remover ausência." });
      } catch {}
    }
  },
};