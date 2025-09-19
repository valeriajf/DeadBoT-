exports.commands = ["get-sticker"];

exports.handle = async (message, ctx = {}) => {
  const { socket } = ctx || {};
  try {
    if (!socket) {
      console.error("[get-sticker] contexto inválido: socket não fornecido");
      return;
    }

    const chatId = message.key.remoteJid;

    // Só funciona se for reply a uma figurinha ou se a mensagem atual for uma figurinha
    const quoted =
      message.message.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
    const sticker = quoted || message.message.stickerMessage;

    if (!sticker) {
      await socket.sendMessage(
        chatId,
        { text: "❌ Por favor, responda a uma figurinha (ou envie a figurinha junto) para obter o ID dela." },
        { quoted: message }
      );
      return;
    }

    const fileSha = sticker.fileSha256;
    if (!fileSha || fileSha.length === 0) {
      await socket.sendMessage(
        chatId,
        { text: "❌ Não consegui ler o identificador da figurinha." },
        { quoted: message }
      );
      return;
    }

    // Converte para ID numérico
    const buf = Buffer.from(fileSha);
    const numeric = Array.from(buf).join(",");

    await socket.sendMessage(
      chatId,
      { text: `🪙 ID da figurinha (Numérico):\n\n${numeric}` },
      { quoted: message }
    );
  } catch (error) {
    console.error("Erro no comando get-sticker:", error);
    try {
      await ctx.socket?.sendMessage(message.key.remoteJid, {
        text: "❌ Ocorreu um erro ao obter o ID da figurinha.",
      });
    } catch {}
  }
};