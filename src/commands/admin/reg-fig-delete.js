/**
 * Comando para remover uma figurinha registrada do sistema de menção automática
 * Este comando deve ser colocado na pasta admin
 * 
 * @author VaL
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "reg-fig-delete",
  description: "Remove uma figurinha registrada do sistema de menção automática",
  commands: ["reg-fig-delete", "remover-figurinha", "reg-fig-del"],
  usage: `${PREFIX}reg-fig-delete (responda a uma figurinha registrada)`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    socket, 
    remoteJid, 
    userJid, 
    message, 
    reply, 
    isQuotedSticker,
    quotedMessage,
    database 
  }) => {
    try {
      // Verifica se está respondendo a uma figurinha
      if (!isQuotedSticker) {
        await reply("❌ Você precisa responder a uma figurinha para removê-la do registro.");
        return;
      }

      // Obtém os dados da figurinha
      const stickerMessage = quotedMessage;
      const stickerSha256 = stickerMessage.message?.stickerMessage?.fileSha256;
      
      if (!stickerSha256) {
        await reply("❌ Não foi possível obter os dados da figurinha.");
        return;
      }

      // Converte o buffer para string base64
      const stickerHash = Buffer.from(stickerSha256).toString('base64');

      // Verifica se a figurinha está registrada
      const existingSticker = await database.get(`mention_sticker_${remoteJid}_${stickerHash}`);
      
      if (!existingSticker) {
        await reply("⚠️ Esta figurinha não está registrada no sistema de menção automática.");
        return;
      }

      // Remove a figurinha do banco de dados
      await database.delete(`mention_sticker_${remoteJid}_${stickerHash}`);

      await reply("✅ Figurinha removida com sucesso do sistema de menção automática!");

    } catch (error) {
      console.error("Erro no comando reg-fig-delete:", error);
      await reply("❌ Erro interno do servidor. Tente novamente mais tarde.");
    }
  },
};