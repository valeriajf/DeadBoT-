/**
 * Comando #debugmsg — mostra a estrutura completa da mensagem recebida.
 * Compatível com o sistema de comandos do DeadBoT.
 */
module.exports = {
  name: "debugmsg",
  description: "Mostra a estrutura completa da mensagem recebida.",
  commands: ["debugmsg"],
  usage: "#debugmsg (responda a qualquer mídia)",

  handle: async (ctx) => {
    try {
      const { webMessage, socket, sendReply } = ctx;

      // Verifica se há mensagem
      if (!webMessage) {
        return sendReply("❌ Não consegui encontrar a mensagem recebida.");
      }

      const msg = webMessage.message || {};
      const json = JSON.stringify(msg, null, 2);
      const output =
        json.length > 3500 ? json.slice(0, 3500) + "\n\n(...cortado...)" : json;

      await socket.sendMessage(
        webMessage.key.remoteJid,
        { text: "📦 Estrutura da mensagem:\n\n" + output },
        { quoted: webMessage }
      );
    } catch (err) {
      try {
        await ctx.sendReply("❌ Erro ao mostrar estrutura: " + err.message);
      } catch {
        console.log("[DEBUGMSG ERROR]", err);
      }
    }
  },
};