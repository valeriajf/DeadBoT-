// COMANDO #CASAL
const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { onlyNumbers } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "casal",
  description: "Forma um casal aleatório do grupo.",
  commands: ["casal", "ship", "match"],
  usage: `${PREFIX}casal`,
  handle: async ({
    sendReply,
    sendErrorReply,
    isGroup,
    socket,
    remoteJid,
  }) => {
    if (!isGroup) {
      await sendErrorReply(
        "Este comando só funciona em grupos!"
      );
      return;
    }

    try {
      // Busca metadados do grupo
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const participants = groupMetadata.participants
        .map(p => p.id)
        .filter(id => !id.includes(':0@')); // Remove apenas números de negócios/bots

      if (participants.length < 2) {
        await sendErrorReply(
          "Grupo precisa ter pelo menos 2 membros para formar um casal!"
        );
        return;
      }

      // Seleciona duas pessoas aleatórias
      const pessoa1 = participants[Math.floor(Math.random() * participants.length)];
      let pessoa2 = participants[Math.floor(Math.random() * participants.length)];
      
      // Garante que não sejam a mesma pessoa
      while (pessoa2 === pessoa1 && participants.length > 1) {
        pessoa2 = participants[Math.floor(Math.random() * participants.length)];
      }

      const number1 = onlyNumbers(pessoa1);
      const number2 = onlyNumbers(pessoa2);
      
      // Calcula compatibilidade
      const compatibility = Math.floor(Math.random() * 101);
      
      const hearts = compatibility > 80 ? '💕💕💕💕💕' :
                     compatibility > 60 ? '💕💕💕💕' :
                     compatibility > 40 ? '💕💕💕' :
                     compatibility > 20 ? '💕💕' : '💔💔';

      const status = compatibility > 90 ? '🎉 MATCH PERFEITO! Casem logo! 💒' :
                     compatibility > 70 ? '✨ Excelente química! Investam nisso! 💫' :
                     compatibility > 50 ? '👍 Boa dupla! Pode dar certo! 😊' :
                     compatibility > 30 ? '🤔 Talvez funcione... com muito esforço! 😅' :
                     '😬 Melhor ficarem como amigos... 👫';

      // Array de ship names criativos
      const shipNames = [
        'Amorzinho', 'Docinhus', 'Coraçãozin', 'Bebêzin', 'Fofurinhas',
        'Lindezas', 'Queridinhus', 'Gatinhus', 'Princesinhus', 'Anjinhus',
        'Mozão', 'Benzinhus', 'Florzinhas', 'Vidinha', 'Tesourinhus',
        'Luvinha', 'Netinhus', 'Mimozinhus', 'Chuchuzinhus', 'Pipoquinhas',
        'Biscoitinhus', 'Melzinhus', 'Açucarzinhus', 'Bombonjinhus', 'Pudimzinhus',
        'Paçoquinhus', 'Beijinhus', 'Chamegus', 'Xodózinhus', 'Paixãozinha'
      ];
      
      const shipName = shipNames[Math.floor(Math.random() * shipNames.length)];

      const message = `${hearts}\n\n💘 *CASAL ALEATÓRIO DO GRUPO* 💘\n\n` +
                     `👫 @${number1} ❤️ @${number2}\n` +
                     `🏷️ Ship name: *${shipName}*\n` +
                     `📊 Compatibilidade: *${compatibility}%*\n\n` +
                     `${status}\n\n` +
                     `${compatibility > 70 ? '🎵 _"É o amor..."_ 🎵' : 
                       compatibility < 30 ? '🎵 _"Amigos, amigos, negócios à parte..."_ 🎵' : ''}`;

      await sendReply(message, [pessoa1, pessoa2]);

    } catch (error) {
      console.error('Erro no comando casal:', error);
      await sendErrorReply(
        "Erro ao formar casal! Tente novamente."
      );
    }
  },
};