// utils/messageUtils.js

/**
 * Edita uma mensagem de texto já enviada pelo bot.
 * @param {import("baileys").WAConnection} socket - Instância do Baileys
 * @param {string} remoteJid - ID do chat (ex: grupo ou contato)
 * @param {string} messageId - ID da mensagem a ser editada
 * @param {string} newText - Novo texto da mensagem
 * @returns {Promise<string|null>} Retorna o novo ID da mensagem editada ou null se falhar
 */
async function editOwnMessage(socket, remoteJid, messageId, newText) {
  try {
    const sentMsg = await socket.sendMessage(remoteJid, {
      text: newText,
      edit: {
        remoteJid,
        id: messageId,
        fromMe: true,
      },
    });
    return sentMsg.key.id;
  } catch (error) {
    console.error("Erro ao editar mensagem:", error);
    return null;
  }
}

module.exports = { editOwnMessage };