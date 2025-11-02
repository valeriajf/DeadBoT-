const { PREFIX } = require(`${BASE_DIR}/config`);
const { deactivateGroup } = require(`${BASE_DIR}/utils/database`);
const { isDono } = require(`${BASE_DIR}/utils/ownerCheck`);

module.exports = {
  name: "off",
  description: "Desativa o bot no grupo",
  commands: ["off"],
  usage: `${PREFIX}off`,
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

    deactivateGroup(remoteJid);

    await sendSuccessReply("✅ Bot desativado no grupo!");
  },
};