/**
 * Comando: #get-sticker
 * Captura o ID base64 da figurinha respondida e envia no chat
 * 
 * Uso: responda a uma figurinha com "#get-sticker"
 */
module.exports = {
  commands: ["get-sticker"],
  description: "Retorna o ID base64 da figurinha respondida",

  handle: async (webMessage, { socket }) => {
    try {
      const chatId = webMessage.key.remoteJid;

      // Verifica se respondeu a uma figurinha
      const contextMsg = webMessage.message?.extendedTextMessage?.contextInfo;
      const quoted = contextMsg?.quotedMessage;

      if (!quoted?.stickerMessage) {
        await socket.sendMessage(chatId, {
          text: "❌ Responda a uma figurinha com #get-sticker",
        }, { quoted: webMessage });
        return;
      }

      // Extrai ID base64
      const stickerID = quoted.stickerMessage.fileSha256.toString("base64");

      await socket.sendMessage(chatId, {
        text: `✅ ID da figurinha:\n\n\`\`\`${stickerID}\`\`\`\n\nCopie e cole no seu código.`,
      }, { quoted: webMessage });

      console.log(`[get-sticker] ID extraído: ${stickerID}`);
    } catch (err) {
      console.error("Erro no comando get-sticker:", err);
    }
  },
};