const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { toUserJid, onlyNumbers } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "corno",
  description: "Mede o nível de corno de um usuário.",
  commands: ["corno", "chifre", "chifrudo"],
  usage: `${PREFIX}corno @usuario`,
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
    const cornoPercent = Math.floor(Math.random() * 101);
    
    const chifres = cornoPercent > 80 ? '🤘🤘🤘🤘🤘' : 
                    cornoPercent > 60 ? '🤘🤘🤘🤘' :
                    cornoPercent > 40 ? '🤘🤘🤘' :
                    cornoPercent > 20 ? '🤘🤘' : '🤘';

    const resultado = cornoPercent > 90 ? 'CORNO MASTER! 👑🤘' :
                     cornoPercent > 70 ? 'Corno Profissional! 🎭' :
                     cornoPercent > 50 ? 'Corno Intermediário 📈' :
                     cornoPercent > 30 ? 'Corno Iniciante 🆕' :
                     'Nem corno é! 😎';

    const frases = cornoPercent > 70 ? [
      '🎵 _"Bate o chifre no teto..."_ 🎵',
      '🎵 _"Ela não é mais sua..."_ 🎵',
      '🎵 _"Chifre que não mata, fortalece..."_ 🎵'
    ] : [''];

    const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];

    const message = `${chifres}\n\n *MEDIDOR DE CORNO* 🐮\n\n` +
                   `👤 Usuário: @${targetNumber}\n` +
                   `🤘 Nível: *${cornoPercent}%*\n` +
                   `📋 Status: *${resultado}*\n\n` +
                   `${fraseAleatoria}`;

    await sendReply(message, [targetJid]);
  },
};