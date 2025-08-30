exports.commands = ["get-sticker"];

exports.handle = async (message, { socket, args }) => {
  try {
    const chatId = message.key.remoteJid;

    // Só funciona se for reply a uma figurinha
    if (!message.message.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage) {
      await socket.sendMessage(chatId, { text: "❌ Por favor, responda a uma figurinha para obter o ID dela." }, { quoted: message });
      return;
    }

    const quotedSticker = message.message.extendedTextMessage.contextInfo.quotedMessage.stickerMessage;
    const stickerID = quotedSticker.fileSha256.toString("base64");

    await socket.sendMessage(chatId, {
      text: `🪙 ID da figurinha:\n${stickerID}`
    }, { quoted: message });

  } catch (error) {
    console.error("Erro no comando get-sticker:", error);
    await socket.sendMessage(message.key.remoteJid, { text: "❌ Ocorreu um erro ao obter o ID da figurinha." });
  }
};