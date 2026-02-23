const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const {
  isBirthdaySystemActive,
  setBirthdaySystem,
} = require(`${BASE_DIR}/utils/niverDatabase`);

module.exports = {
  name: "niver",
  description: "Ativa ou desativa o sistema de aniversários automático (admin)",
  commands: ["niver", "sistema-niver", "aniversario-auto"],
  usage: `${PREFIX}niver [1/0]`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    args,
    remoteJid,
    sendReply,
    sendSuccessReact,
    sendWaitReact,
  }) => {
    // Se não passar argumento, mostrar status atual
    if (!args.length || !args[0]) {
      const isActive = isBirthdaySystemActive(remoteJid);
      await sendReply(
        `🎂 *Sistema de Aniversários*\n\n` +
          `Status: ${isActive ? "✅ *Ativado*" : "❌ *Desativado*"}\n\n` +
          `📌 Para ativar: *${PREFIX}niver 1*\n` +
          `📌 Para desativar: *${PREFIX}niver 0*`
      );
      return;
    }

    const option = args[0].trim();

    if (option !== "0" && option !== "1") {
      throw new InvalidParameterError(
        `❌ Opção inválida!\n\n` +
          `📌 Use *1* para ativar ou *0* para desativar:\n` +
          `${PREFIX}niver 1\n` +
          `${PREFIX}niver 0`
      );
    }

    const activate = option === "1";
    const isCurrentlyActive = isBirthdaySystemActive(remoteJid);

    if (activate && isCurrentlyActive) {
      throw new WarningError(
        `⚠️ O sistema de aniversários já está *ativado* neste grupo!\n\n` +
          `📌 Para desativar: *${PREFIX}niver 0*`
      );
    }

    if (!activate && !isCurrentlyActive) {
      throw new WarningError(
        `⚠️ O sistema de aniversários já está *desativado* neste grupo!\n\n` +
          `📌 Para ativar: *${PREFIX}niver 1*`
      );
    }

    await sendWaitReact();
    setBirthdaySystem(remoteJid, activate);
    await sendSuccessReact();

    if (activate) {
      await sendReply(
        `✅ *Sistema de Aniversários ATIVADO!* 🎂\n\n` +
          `🎉 A partir de agora, parabenizarei automaticamente os membros às *7:00h* do dia do aniversário!\n\n` +
          `💡 *Dica:* Os membros podem registrar seus aniversários com:\n` +
          `${PREFIX}niver-reg DD/MM/AAAA`
      );
    } else {
      await sendReply(
        `❌ *Sistema de Aniversários DESATIVADO!*\n\n` +
          `O bot não enviará mais mensagens automáticas de aniversário neste grupo.\n\n` +
          `📌 Para reativar: *${PREFIX}niver 1*`
      );
    }
  },
};
