const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { onlyNumbers, toUserJidOrLid } = require(`${BASE_DIR}/utils`);
const path = require("node:path");
const { ASSETS_DIR } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "duelar",
  description: "Desafia alguém para um duelo.",
  commands: ["duelar"],
  usage: `${PREFIX}duelar @usuario`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    sendGifFromFile,
    sendErrorReply,
    userJid,
    replyJid,
    args,
    isReply,
  }) => {
    if (!args.length && !isReply) {
      throw new InvalidParameterError(
        "Você precisa mencionar ou marcar um membro para duelar!"
      );
    }

    const targetJid = isReply ? replyJid : toUserJidOrLid(args[0]);

    if (!targetJid) {
      await sendErrorReply(
        "Você precisa mencionar um usuário ou responder uma mensagem para duelar."
      );

      return;
    }

    const userNumber = onlyNumbers(userJid);
    const targetNumber = onlyNumbers(targetJid);

    const winner = Math.random() < 0.5 ? userNumber : targetNumber;
    const loser = winner === userNumber ? targetNumber : userNumber;
    const winnerJid = winner === userNumber ? userJid : targetJid;
    const loserJid = winnerJid === userJid ? targetJid : userJid;

    await sendGifFromFile(
      path.resolve(ASSETS_DIR, "images", "funny", "duel.mp4"),
      `⚔️ @${userNumber} desafiou @${targetNumber} para um duelo!\n\n🏆 O vencedor foi... @${winner}! @${loser} foi derrotado! 💀`,
      [userJid, targetJid, winnerJid, loserJid]
    );
  },
};