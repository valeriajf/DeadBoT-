const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { toUserJid, onlyNumbers } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "calvo",
  description: "Mede o nível de calvície de um usuário.",
  commands: ["calvo", "careca", "calvicie"],
  usage: `${PREFIX}calvo @usuario`,
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
    const calvoPercent = Math.floor(Math.random() * 101);
    
    const emojis = calvoPercent > 80 ? '🥚🥚🥚🥚🥚' : 
                   calvoPercent > 60 ? '👨‍🦲👨‍🦲👨‍🦲' :
                   calvoPercent > 40 ? '👨‍🦲👨‍🦲' :
                   calvoPercent > 20 ? '👨‍🦲' : '🧑‍🦱';

    const resultado = calvoPercent > 95 ? 'OVO MASTER! 🥚✨' :
                     calvoPercent > 80 ? 'Careca Profissional! 👨‍🦲🏆' :
                     calvoPercent > 60 ? 'Calvície Avançada! 👨‍🦲📈' :
                     calvoPercent > 40 ? 'Entradas Visíveis! 👀' :
                     calvoPercent > 20 ? 'Cabelo Rareando... 😅' :
                     'Cabeludo Raiz! 🦱👑';

    const frases = calvoPercent > 70 ? [
      '✨ Brilha mais que LED!',
      '🌞 Reflete a luz do sol!',
      '🪞 Serve como espelho!',
      '🛸 UFO confunde com nave!',
      '💡 Economiza na conta de luz!',
      '⚾ Confundem com bola de bilhar!'
    ] : calvoPercent > 30 ? [
      '🧴 Minoxidil não resolve mais...',
      '🧢 Sempre de boné ou chapéu',
      '💨 O vento é seu inimigo',
      '📸 Evita foto de cima'
    ] : [
      '💇‍♂️ Vai no barbeiro todo mês!',
      '🦱 Shampoo? Que isso!',
      '💆‍♂️ Massagem capilar em dia!'
    ];

    const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];

    const message = `${emojis}\n\n *MEDIDOR DE CALVÍCIE* 💆\n\n` +
                   `👤 Usuário: @${targetNumber}\n` +
                   `👨‍🦲 Nível: *${calvoPercent}%*\n` +
                   `📋 Status: *${resultado}*\n\n` +
                   `💭 _${fraseAleatoria}_`;

    await sendReply(message, [targetJid]);
  },
};