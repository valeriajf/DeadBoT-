/**
 * Comando para fechar o grupo quando uma figurinha específica for enviada
 * Coloque este arquivo na pasta admin (pois só admins devem poder fechar grupos)
 * 
 * @author Dev VaL
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "fechar-fig",
  description: "Fecha o grupo quando uma figurinha específica for enviada",
  commands: ["fechar-fig"],
  usage: `Envie a figurinha específica para fechar o grupo`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    sendReply,
    sendErrorReply,
    socket,
    webMessage,
    isGroupMessage,
    isFromAdmins,
    groupId
  }) => {
    try {
      // Verifica se é em grupo
      if (!isGroupMessage) {
        return;
      }

      // Verifica se é admin
      if (!isFromAdmins) {
        return;
      }

      // Verifica se é uma figurinha
      const sticker = webMessage.message.stickerMessage;
      if (!sticker) {
        return;
      }

      // ID da figurinha que fecha o grupo (substitua pelos valores da sua figurinha)
      const STICKER_FECHAR_ID = [77,39,107,160,184,5,93,190,88,208,84,52,172,128,103,151,136,45,79,146,238,0,94,239,111,202,78,75,85,178,236,115];
      
      const fileSha = sticker.fileSha256;
      if (!fileSha || fileSha.length === 0) {
        return;
      }

      // Converte para ID numérico
      const buf = Buffer.from(fileSha);
      const currentStickerID = Array.from(buf);
      
      // Compara os IDs
      const isMatchingSticker = STICKER_FECHAR_ID.length === currentStickerID.length && 
        STICKER_FECHAR_ID.every((val, index) => val === currentStickerID[index]);

      if (!isMatchingSticker) {
        return;
      }

      // Fecha o grupo (permite apenas admins enviarem mensagens)
      await socket.groupSettingUpdate(groupId, 'announcement');
      
      // Mensagem de confirmação
      await sendReply("🔒 *Grupo fechado!* Apenas administradores podem enviar mensagens.");

    } catch (error) {
      console.error("Erro no comando fechar-fig:", error);
      await sendErrorReply(`❌ Ocorreu um erro ao tentar fechar o grupo: ${error.message}`);
    }
  },
};