exports.commands = ["regras"];

exports.handle = async (message, { socket }) => {
  try {
    const chatId = message.key.remoteJid;

    // Verifica se é grupo
    if (!chatId.endsWith("@g.us")) {
      await socket.sendMessage(chatId, { text: "❌ Este comando só pode ser usado em grupos." }, { quoted: message });
      return;
    }

    // Pega os dados do grupo (foto, descrição)
    const groupMetadata = await socket.groupMetadata(chatId);

    // Busca a foto do grupo (se houver)
    let pictureUrl = null;
    try {
      pictureUrl = await socket.profilePictureUrl(chatId, "image");
    } catch {
      pictureUrl = null; // grupo sem foto
    }

    // Monta a mensagem
    let caption = `*📋 Regras e Informações do grupo:*\n\n`;
    if (groupMetadata.desc) {
      caption += groupMetadata.desc;
    } else {
      caption += "_Este grupo não possui uma descrição definida._";
    }

    if (pictureUrl) {
      // Envia foto com a descrição
      await socket.sendMessage(chatId, {
        image: { url: pictureUrl },
        caption,
      }, { quoted: message });
    } else {
      // Envia só a descrição
      await socket.sendMessage(chatId, {
        text: caption,
      }, { quoted: message });
    }
  } catch (error) {
    console.error("Erro no comando regras:", error);
    await socket.sendMessage(message.key.remoteJid, { text: "❌ Ocorreu um erro ao obter as regras do grupo." });
  }
};