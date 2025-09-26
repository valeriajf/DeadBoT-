const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { toUserJid, onlyNumbers } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "gado",
  description: "Mede o nível de gado de um usuário.",
  commands: ["gado", "gadao", "simp"],
  usage: `${PREFIX}gado @usuario`,
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
    const gadoPercent = Math.floor(Math.random() * 101);
    
    const emojis = gadoPercent > 80 ? '🐮🐮🐮🐮🐮' : 
                   gadoPercent > 60 ? '🐮🐮🐮🐮' :
                   gadoPercent > 40 ? '🐮🐮🐮' :
                   gadoPercent > 20 ? '🐮🐮' : '🐮';

    const resultado = gadoPercent > 90 ? 'GADO MASTER! 🐄👑' :
                     gadoPercent > 70 ? 'Super Gado! 🐮💸' :
                     gadoPercent > 50 ? 'Gado Intermediário 🐮📱' :
                     gadoPercent > 30 ? 'Gado Iniciante 🐮🆕' :
                     'Nem gado é! 😎👑';

    const frases = gadoPercent > 60 ? [
      '💸 Acabou o dinheiro do pix...',
      '📱 "Oi princesa, como foi seu dia?"',
      '🎁 Gastou o 13º com ela...',
      '💔 "Você merece coisa melhor que eu"',
      '🤡 Pagou a conta e não beijou nem a testa'
    ] : [
      '👑 Rei da própria vida!',
      '💰 Investe em crypto, não em crush',
      '🦾 Foco, força e fé!'
    ];

    const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];

    const message = `${emojis}\n\n *MEDIDOR DE GADO* 🐂\n\n` +
                   `👤 Usuário: @${targetNumber}\n` +
                   `🐮 Nível: *${gadoPercent}%*\n` +
                   `📋 Status: *${resultado}*\n\n` +
                   `💭 _${fraseAleatoria}_`;

    await sendReply(message, [targetJid]);
  },
};