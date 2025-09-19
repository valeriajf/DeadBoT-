/**
 * Comando para obter o link do grupo
 *
 * @author VaL
 */
const { errorLog } = require(`${BASE_DIR}/utils/logger`);
const { PREFIX } = require(`${BASE_DIR}/config`);
const { DangerError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "link-grupo",
  description: "Obtém o link do grupo",
  commands: ["link-grupo", "link-gp"],
  usage: `${PREFIX}link-grupo`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    socket,
    sendReact,
    sendReply,
    sendErrorReply,
    remoteJid,
  }) => {
    try {
      // Obtém o código de convite do grupo
      const groupCode = await socket.groupInviteCode(remoteJid);

      if (!groupCode) {
        throw new DangerError("Preciso ser admin!");
      }

      // Obtém metadados do grupo
      const groupMetadata = await socket.groupMetadata(remoteJid);
      
      // Monta o link de convite
      const groupInviteLink = `https://chat.whatsapp.com/${groupCode}`;
      
      // Prepara a mensagem com informações do grupo
      const messageText = `*${groupMetadata.subject}*\n\nConvite para conversa em grupo\n\n${groupInviteLink}`;

      await sendReact("🪀");

      // Verifica se o grupo tem foto de perfil
      try {
        const profilePicUrl = await socket.profilePictureUrl(remoteJid, 'image');
        
        if (profilePicUrl) {
          // Envia a mensagem com a imagem do grupo
          await socket.sendMessage(remoteJid, {
            image: { url: profilePicUrl },
            caption: messageText,
          });
        } else {
          // Se não há imagem, envia apenas o texto
          await sendReply(messageText);
        }
      } catch (profileError) {
        // Se falhar ao obter a imagem, envia apenas o texto
        console.log("Não foi possível obter a foto do grupo:", profileError.message);
        await sendReply(messageText);
      }

    } catch (error) {
      errorLog(error);
      await sendErrorReply("Preciso ser admin para gerar o link do grupo!");
    }
  },
};