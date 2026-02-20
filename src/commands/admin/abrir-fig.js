/**
 * Comando para abrir o grupo quando uma figurinha específica for enviada
 * Coloque este arquivo na pasta admin (pois só admins devem poder abrir grupos)
 * 
 * @author Dev VaL
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "abrir-fig",
  description: "Abre o grupo quando uma figurinha específica for enviada",
  commands: ["abrir-fig"],
  usage: `Envie a figurinha específica para abrir o grupo`,
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

      // ID da figurinha que abre o grupo (substitua pelos valores da sua figurinha)
      const STICKER_ABRIR_ID = [97,62,124,11,59,129,95,121,20,118,54,129,110,122,217,31,67,84,40,72,191,59,28,197,58,21,123,174,226,168,211,199];
      
      const fileSha = sticker.fileSha256;
      if (!fileSha || fileSha.length === 0) {
        return;
      }

      // Converte para ID numérico
      const buf = Buffer.from(fileSha);
      const currentStickerID = Array.from(buf);
      
      // Compara os IDs
      const isMatchingSticker = STICKER_ABRIR_ID.length === currentStickerID.length && 
        STICKER_ABRIR_ID.every((val, index) => val === currentStickerID[index]);

      if (!isMatchingSticker) {
        return;
      }

      // Abre o grupo (remove restrição para todos os membros)
      await socket.groupSettingUpdate(groupId, 'not_announcement');
      
      // Mensagem de confirmação
      await sendReply("🔓 *Grupo aberto!* Agora todos podem enviar mensagens.");

    } catch (error) {
      console.error("Erro no comando abrir-fig:", error);
      await sendErrorReply(`❌ Ocorreu um erro ao tentar abrir o grupo: ${error.message}`);
    }
  },
};