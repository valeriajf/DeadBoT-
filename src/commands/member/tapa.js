// COMANDO #TAPA
const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { toUserJid, onlyNumbers } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "tapa",
  description: "Dá um tapa em um usuário desejado.",
  commands: ["tapa", "tapao", "tapinha"],
  usage: `${PREFIX}tapa @usuario`,
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
        "Você precisa mencionar ou marcar um membro para dar o tapa!"
      );
    }

    const targetJid = isReply ? replyJid : toUserJid(args[0]);

    if (!targetJid) {
      await sendErrorReply(
        "Você precisa mencionar um usuário ou responder uma mensagem para dar o tapa."
      );
      return;
    }

    const userNumber = onlyNumbers(userJid);
    const targetNumber = onlyNumbers(targetJid);

    const tapas = [
      `👋 @${userNumber} deu um tapa na cara de @${targetNumber}! PLAFT! 💥`,
      `🤚 @${targetNumber} levou um tapão de @${userNumber}! Doeu até aqui! 😵`,
      `✋ @${userNumber} aplicou um tapa educativo em @${targetNumber}! 📚`,
      `👏 @${targetNumber} ganhou uma palmada de @${userNumber}! Que barulhão! 🔊`,
      `🫱 @${userNumber} deu um tapa técnico em @${targetNumber}! Nota 10! ⭐`,
      `🤜 @${targetNumber} recebeu um five de @${userNumber}... na cara! 😅`
    ];

    const tapaAleatorio = tapas[Math.floor(Math.random() * tapas.length)];
    await sendReply(tapaAleatorio, [userJid, targetJid]);
  },
};