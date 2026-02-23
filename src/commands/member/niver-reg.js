const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const {
  registerBirthday,
  getBirthday,
} = require(`${BASE_DIR}/utils/niverDatabase`);

module.exports = {
  name: "niver-reg",
  description: "Registra ou edita seu aniversário",
  commands: ["niver-reg", "niver-registrar", "niver-cadastrar"],
  usage: `${PREFIX}niver-reg DD/MM/AAAA`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    fullArgs,
    userJid,
    sendReply,
    sendSuccessReact,
    sendWaitReact,
  }) => {
    if (!fullArgs || !fullArgs.trim()) {
      throw new InvalidParameterError(
        `❌ Você precisa fornecer sua data de nascimento!\n\n` +
          `📌 *Uso correto:*\n${PREFIX}niver-reg DD/MM/AAAA\n\n` +
          `📌 *Exemplo:*\n${PREFIX}niver-reg 20/01/1997`
      );
    }

    const dateStr = fullArgs.trim();

    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateStr.match(dateRegex);

    if (!match) {
      throw new InvalidParameterError(
        `❌ Formato de data inválido!\n\n` +
          `📌 *Use o formato:* DD/MM/AAAA\n` +
          `📌 *Exemplo:* 20/01/1997`
      );
    }

    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);

    const now = new Date();
    const currentYear = now.getFullYear();
    if (year < 1900 || year > currentYear) {
      throw new InvalidParameterError(
        `❌ Ano inválido! O ano deve estar entre *1900* e *${currentYear}*.`
      );
    }

    if (month < 1 || month > 12) {
      throw new InvalidParameterError(
        `❌ Mês inválido! O mês deve estar entre *01* e *12*.`
      );
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      throw new InvalidParameterError(
        `❌ Dia inválido! Para o mês ${month.toString().padStart(2, "0")}/${year}, o dia deve estar entre *01* e *${daysInMonth}*.`
      );
    }

    await sendWaitReact();

    const existing = getBirthday(userJid);
    const isEdit = !!existing;

    registerBirthday(userJid, day, month, year);

    const formattedDate = `${day.toString().padStart(2, "0")}/${month
      .toString()
      .padStart(2, "0")}/${year}`;

    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const birthdayPassedThisYear =
      month < currentMonth || (month === currentMonth && day <= currentDay);
    const age = currentYear - year - (birthdayPassedThisYear ? 0 : 1);

    await sendSuccessReact();

    if (isEdit) {
      await sendReply(
        `✅ *Aniversário atualizado com sucesso!*\n\n` +
          `📅 Nova data: *${formattedDate}*\n` +
          `🎂 Idade atual: *${age} anos*\n\n` +
          `_"Celebre cada ano de vida!"_ 🎊`
      );
    } else {
      await sendReply(
        `🎉 *Aniversário registrado com sucesso!*\n\n` +
          `📅 Data: *${formattedDate}*\n` +
          `🎂 Idade atual: *${age} anos*\n\n` +
          `_Agora vou te parabenizar no seu dia especial!_ 🎊`
      );
    }
  },
};
