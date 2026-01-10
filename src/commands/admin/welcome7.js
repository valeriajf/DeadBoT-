const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX } = require(`${BASE_DIR}/config`);
const {
  activateWelcome7Group,
  deactivateWelcome7Group,
  isActiveWelcome7Group,
} = require(`${BASE_DIR}/utils/database`);

module.exports = {
  name: "welcome7",
  description: "Ativa ou desativa boas-vindas com GIF + Áudio",
  commands: ["welcome7", "bv7"],
  usage: `${PREFIX}welcome7 1 ou 0`,
  handle: async ({
    args,
    isGroup,
    remoteJid,
    sendSuccessReply,
    sendWarningReply,
  }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Somente em grupos!");
    }

    if (!args.length || !["1", "0"].includes(args[0])) {
      throw new InvalidParameterError(
        `Use: ${PREFIX}welcome7 1 (ativar) ou ${PREFIX}welcome7 0 (desativar)`
      );
    }

    const activate = args[0] === "1";
    const isActive = await isActiveWelcome7Group(remoteJid);

    if (activate) {
      if (isActive) {
        await sendWarningReply("⚠️ Welcome7 já está ativo neste grupo!");
        return;
      }

      await activateWelcome7Group(remoteJid);
      await sendSuccessReply(
        `✅ Welcome7 ativado!\n\n` +
          `🎬 Configure GIF: ${PREFIX}set-gif-bv7 (responder GIF)\n` +
          `🎵 Configure áudio: ${PREFIX}set-audio-bv7 (responder áudio)\n` +
          `📝 Legenda: ${PREFIX}legenda-bv7 <texto>`
      );
    } else {
      if (!isActive) {
        await sendWarningReply("⚠️ Welcome7 já está desativado!");
        return;
      }

      await deactivateWelcome7Group(remoteJid);
      await sendSuccessReply("✅ Welcome7 desativado!");
    }
  },
};