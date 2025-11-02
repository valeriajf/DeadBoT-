const { PREFIX } = require(`${BASE_DIR}/config`);
const { activateGroup } = require(`${BASE_DIR}/utils/database`);
const { isDono } = require(`${BASE_DIR}/utils/ownerCheck`);

module.exports = {
  name: "on",
  description: "Ativa o bot no grupo",
  commands: ["on"],
  usage: `${PREFIX}on`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ sendSuccessReply, sendErrorReply, remoteJid, isGroup, userJid }) => {
    // Verifica se é o dono do bot
    if (!isDono(userJid)) {
      await sendErrorReply("⛔ Este comando é exclusivo para o dono do bot!");
      return;
    }

    if (!isGroup) {
      await sendErrorReply("❌ Este comando deve ser usado dentro de um grupo.");
      return;
    }

    activateGroup(remoteJid);

    await sendSuccessReply("✅ Bot ativado no grupo!");
  },
};