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
      const STICKER_ABRIR_ID = [139,1,67,253,90,103,35,125,103,66,210,172,200,83,90,137,183,85,4,140,172,20,180,120,64,201,24,163,69,79,13,60];
      
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