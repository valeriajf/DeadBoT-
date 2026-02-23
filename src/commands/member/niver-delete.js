const { PREFIX } = require(`${BASE_DIR}/config`);
const { WarningError } = require(`${BASE_DIR}/errors`);
const {
  getBirthday,
  deleteBirthday,
} = require(`${BASE_DIR}/utils/niverDatabase`);

module.exports = {
  name: "niver-delete",
  description: "Exclui o seu registro de aniversário",
  commands: ["niver-delete", "niver-excluir", "niver-remover"],
  usage: `${PREFIX}niver-delete`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ userJid, sendReply, sendSuccessReact, sendWaitReact }) => {
    const existing = getBirthday(userJid);

    if (!existing) {
      throw new WarningError(
        `⚠️ Você não possui nenhum aniversário registrado!\n\n` +
          `📌 Para registrar, use:\n${PREFIX}niver-reg DD/MM/AAAA`
      );
    }

    await sendWaitReact();

    const { day, month, year } = existing;
    const formattedDate = `${day.toString().padStart(2, "0")}/${month
      .toString()
      .padStart(2, "0")}/${year}`;

    deleteBirthday(userJid);

    await sendSuccessReact();
    await sendReply(
      `🗑️ *Aniversário excluído com sucesso!*\n\n` +
        `📅 Data removida: *${formattedDate}*\n\n` +
        `_Caso queira registrar novamente, use:_\n${PREFIX}niver-reg DD/MM/AAAA`
    );
  },
};
