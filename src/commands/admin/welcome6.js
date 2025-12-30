const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX } = require(`${BASE_DIR}/config`);
const {
  activateWelcome6Group,
  deactivateWelcome6Group,
  isActiveWelcome6Group,
} = require(`${BASE_DIR}/utils/database`);

module.exports = {
  name: "welcome6",
  description: "Ativa ou desativa boas-vindas com vídeo no grupo",
  commands: ["welcome6", "bv6"],
  usage: `${PREFIX}welcome6 1 ou 0`,
  handle: async ({
    args,
    isGroup,
    remoteJid,
    sendSuccessReply,
    sendWarningReply,
  }) => {
    if (!isGroup) {
      throw new InvalidParameterError(
        "Este comando só pode ser usado em grupos!"
      );
    }

    if (!args.length || !["1", "0"].includes(args[0])) {
      throw new InvalidParameterError(
        `Use: ${PREFIX}welcome6 1 (ativar) ou ${PREFIX}welcome6 0 (desativar)`
      );
    }

    const activate = args[0] === "1";
    const isActive = await isActiveWelcome6Group(remoteJid);

    if (activate) {
      if (isActive) {
        await sendWarningReply("⚠️ Welcome6 já está ativo neste grupo!");
        return;
      }

      await activateWelcome6Group(remoteJid);
      await sendSuccessReply(
        `✅ Welcome6 ativado!\n\n` +
          `📹 Configure: ${PREFIX}set-video-bv6 (responder vídeo)\n` +
          `📝 Legenda: ${PREFIX}legenda-bv6 <texto>`
      );
    } else {
      if (!isActive) {
        await sendWarningReply("⚠️ Welcome6 já está desativado!");
        return;
      }

      await deactivateWelcome6Group(remoteJid);
      await sendSuccessReply("✅ Welcome6 desativado!");
    }
  },
};