/**
 * Comando fig-tag para marcar figurinhas e notificar todos os membros do grupo
 * Apenas administradores podem usar este comando
 *
 * @author VaL 
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "fig-tag",
  description: "Marca uma figurinha e notifica todos os membros do grupo",
  commands: ["fig-tag", "figtag", "tagfig"],
  usage: `${PREFIX}fig-tag (responda a uma figurinha)`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    isGroup, 
    isReply, 
    webMessage, 
    sendText,
    socket, 
    remoteJid, 
    sendReact,
    sendErrorReply 
  }) => {
    try {
      // Verifica se o comando está sendo usado em um grupo
      if (!isGroup) {
        return await sendErrorReply("❌ Este comando só pode ser usado em grupos!");
      }

      // Verifica se o comando está respondendo a uma mensagem
      if (!isReply) {
        return await sendErrorReply("❌ Você precisa responder a uma figurinha para usar este comando!");
      }

      // Acessa a mensagem citada
      const contextInfo = webMessage.message?.extendedTextMessage?.contextInfo;
      const quotedMessage = contextInfo?.quotedMessage;
      
      // Verifica se a mensagem citada é uma figurinha
      if (!quotedMessage?.stickerMessage) {
        return await sendErrorReply("❌ Você precisa responder especificamente a uma figurinha!");
      }

      // Pega os participantes usando exatamente o mesmo método do hidetag
      const { participants } = await socket.groupMetadata(remoteJid);
      const mentions = participants.map(({ id }) => id);

      // Reage com emoji de marcação
      await sendReact("🏷️");

      // Envia a figurinha como encaminhada
      const quotedKey = contextInfo.stanzaId ? {
        remoteJid: contextInfo.participant || remoteJid,
        fromMe: false,
        id: contextInfo.stanzaId
      } : null;

      if (quotedKey) {
        await socket.sendMessage(remoteJid, {
          forward: {
            key: quotedKey,
            message: { stickerMessage: quotedMessage.stickerMessage }
          }
        });
      } else {
        await socket.sendMessage(remoteJid, {
          sticker: quotedMessage.stickerMessage
        });
      }

      // Usa exatamente a mesma função do hidetag para marcar todos
      await sendText("🏷️ Figurinha marcada para todos!", mentions);

    } catch (error) {
      console.error("Erro no comando fig-tag:", error);
      await sendErrorReply("❌ Ocorreu um erro ao executar o comando. Tente novamente!");
    }
  },
};