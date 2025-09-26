const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { toUserJid, onlyNumbers } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "gay",
  description: "Mede o nível de gayness de um usuário.",
  commands: ["gay", "gayness", "homo"],
  usage: `${PREFIX}gay @usuario`,
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
        "Você precisa mencionar ou marcar um membro!"
      );
    }

    const targetJid = isReply ? replyJid : toUserJid(args[0]);

    if (!targetJid) {
      await sendErrorReply(
        "Você precisa mencionar um usuário ou responder uma mensagem."
      );
      return;
    }

    const targetNumber = onlyNumbers(targetJid);
    const gayPercent = Math.floor(Math.random() * 101);
    
    const emojis = gayPercent > 80 ? '🏳️‍🌈🏳️‍🌈🏳️‍🌈' : 
                   gayPercent > 60 ? '🏳️‍🌈🏳️‍🌈' :
                   gayPercent > 30 ? '🏳️‍🌈' : '👨‍👩‍👧‍👦';

    const resultado = gayPercent > 90 ? 'ULTRA GAY! 💅' :
                     gayPercent > 70 ? 'Muito gay! 🌈' :
                     gayPercent > 50 ? 'Meio gay 🤔' :
                     gayPercent > 20 ? 'Pouco gay 😐' :
                     'Hétero raiz! 👨‍👩‍👧‍👦';

    const message = `${emojis}\n\n *MEDIDOR DE GAYNESS* ✨\n\n` +
                   `👤 Usuário: @${targetNumber}\n` +
                   `🏳️‍🌈 Nível: *${gayPercent}%*\n` +
                   `📋 Status: *${resultado}*`;

    await sendReply(message, [targetJid]);
  },
};