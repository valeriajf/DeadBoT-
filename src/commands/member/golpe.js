const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { toUserJid, onlyNumbers } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "golpe",
  description: "Aplica um golpe em um usuário desejado.",
  commands: ["golpe", "golpes", "scam"],
  usage: `${PREFIX}golpe @usuario`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    sendReply,
    sendErrorReply,
    userJid,
    replyJid,
    args,
    isReply,
  }) => {
    if (!args.length && !isReply) {
      throw new InvalidParameterError(
        "Você precisa mencionar ou marcar um membro para aplicar o golpe!"
      );
    }

    const targetJid = isReply ? replyJid : toUserJid(args[0]);

    if (!targetJid) {
      await sendErrorReply(
        "Você precisa mencionar um usuário ou responder uma mensagem para aplicar o golpe."
      );

      return;
    }

    const userNumber = onlyNumbers(userJid);
    const targetNumber = onlyNumbers(targetJid);

    // Array com diferentes tipos de golpes
    const golpes = [
      `💰 @${userNumber} aplicou o golpe do PIX em @${targetNumber}! Perdeu R$ 500! 💸`,
      `📱 @${targetNumber} caiu no golpe do WhatsApp Gold aplicado por @${userNumber}! 🤡`,
      `🎯 @${userNumber} vendeu curso de trader para @${targetNumber}! "Fique rico em 7 dias!" 📈`,
      `💎 @${targetNumber} comprou Bitcoin de @${userNumber}... era Dogecoin! 🐕`,
      `🏠 @${userNumber} vendeu a Torre Eiffel para @${targetNumber}! Entrega em 30 dias! 🗼`,
      `🚗 @${targetNumber} comprou uma Ferrari de @${userNumber} pelo Mercado Livre... chegou um Hot Wheels! 🏎️`,
      `💳 @${userNumber} ofereceu cartão de crédito sem anuidade para @${targetNumber}! Taxa: apenas R$ 200/mês! 💳`,
      `📞 @${targetNumber} ganhou um iPhone no sorteio falso de @${userNumber}! Só pagar o frete de R$ 300! 📱`,
      `🎮 @${userNumber} vendeu hack de Free Fire para @${targetNumber}! Funcionava... por 5 minutos! 🔫`,
      `🍕 @${targetNumber} pediu pizza grátis no link de @${userNumber}... perdeu os dados do cartão! 🍕`,
      `💊 @${userNumber} vendeu remédio milagroso para @${targetNumber}! Era Tic Tac! 💊`,
      `🎓 @${targetNumber} comprou diploma universitário de @${userNumber}! Formatura foi no Paint! 🎓`,
      `⚡ @${userNumber} vendeu energia elétrica mais barata para @${targetNumber}! Conta veio em dobro! ⚡`,
      `🎪 @${targetNumber} investiu no circo de @${userNumber}! Os palhaços eram de verdade! 🤡`,
      `🚀 @${userNumber} vendeu viagem para Marte para @${targetNumber}! Foguete era de papelão! 🚀`
    ];

    // Seleciona um golpe aleatório
    const golpeAleatorio = golpes[Math.floor(Math.random() * golpes.length)];

    await sendReply(golpeAleatorio, [userJid, targetJid]);
  },
};