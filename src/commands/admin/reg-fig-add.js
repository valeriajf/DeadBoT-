/**
 * Comando para registrar uma figurinha que marca todos os membros do grupo quando enviada por um ADM
 * Este comando deve ser colocado na pasta admin
 * 
 * @author VaL
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "reg-fig-add",
  description: "Registra uma figurinha para marcar todos os membros quando enviada por um ADM",
  commands: ["reg-fig-add", "registrar-figurinha"],
  usage: `${PREFIX}reg-fig-add (responda a uma figurinha)`,
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
        await reply("❌ Você precisa responder a uma figurinha para registrá-la.");
        return;
      }

      // Obtém os dados da figurinha
      const stickerMessage = quotedMessage;
      const stickerSha256 = stickerMessage.message?.stickerMessage?.fileSha256;
      
      if (!stickerSha256) {
        await reply("❌ Não foi possível obter os dados da figurinha.");
        return;
      }

      // Converte o buffer para string base64 para armazenamento
      const stickerHash = Buffer.from(stickerSha256).toString('base64');

      // Verifica se a figurinha já está registrada
      const existingSticker = await database.get(`mention_sticker_${remoteJid}_${stickerHash}`);
      
      if (existingSticker) {
        await reply("⚠️ Esta figurinha já está registrada para marcar todos os membros.");
        return;
      }

      // Registra a figurinha no banco de dados
      await database.set(`mention_sticker_${remoteJid}_${stickerHash}`, {
        groupJid: remoteJid,
        stickerHash: stickerHash,
        registeredBy: userJid,
        registeredAt: new Date().toISOString()
      });

      await reply("✅ Figurinha registrada com sucesso! Agora quando um ADM enviar esta figurinha, todos os membros serão marcados.");

    } catch (error) {
      console.error("Erro no comando reg-fig-add:", error);
      await reply("❌ Erro interno do servidor. Tente novamente mais tarde.");
    }
  },
};