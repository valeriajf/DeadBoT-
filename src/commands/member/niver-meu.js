const { PREFIX } = require(`${BASE_DIR}/config`);
const { WarningError } = require(`${BASE_DIR}/errors`);
const { getBirthday } = require(`${BASE_DIR}/utils/niverDatabase`);

module.exports = {
  name: "niver-meu",
  description: "Mostra a sua data de aniversário registrada",
  commands: ["niver-meu", "niver-ver", "niver-data"],
  usage: `${PREFIX}niver-meu`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ userJid, sendReply, sendSuccessReact }) => {
    const birthday = getBirthday(userJid);

    if (!birthday) {
      throw new WarningError(
        `⚠️ Você não possui nenhum aniversário registrado!\n\n` +
          `📌 Para registrar, use:\n${PREFIX}niver-reg DD/MM/AAAA`
      );
    }

    const { day, month, year } = birthday;
    const formattedDate = `${day.toString().padStart(2, "0")}/${month
      .toString()
      .padStart(2, "0")}/${year}`;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const age = currentYear - year;

    // Calcular dias para o próximo aniversário
    let nextBirthdayYear = currentYear;
    if (
      month < currentMonth ||
      (month === currentMonth && day < currentDay)
    ) {
      nextBirthdayYear = currentYear + 1;
    }

    const nextBirthday = new Date(nextBirthdayYear, month - 1, day);
    const today = new Date(currentYear, currentMonth - 1, currentDay);
    const daysUntil = Math.round(
      (nextBirthday - today) / (1000 * 60 * 60 * 24)
    );

    let daysMessage = "";
    if (daysUntil === 0) {
      daysMessage = `\n🎉 *HOJE É SEU ANIVERSÁRIO!* 🎉`;
    } else if (daysUntil === 1) {
      daysMessage = `\n⏳ Falta *1 dia* para seu aniversário!`;
    } else {
      daysMessage = `\n⏳ Faltam *${daysUntil} dias* para seu aniversário!`;
    }

    await sendSuccessReact();
    await sendReply(
      `🎂 *Seu Aniversário*\n\n` +
        `📅 Data: *${formattedDate}*\n` +
        `🎈 Idade atual: *${age} anos*` +
        daysMessage +
        `\n\n_"Celebre cada ano de vida!"_ 🎊`
    );
  },
};
