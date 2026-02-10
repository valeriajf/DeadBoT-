// @author: VaL

const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

// Cache para armazenar últimas mensagens usadas por grupo
const lastMessagesCache = new Map();

module.exports = {
  name: "parabens",
  description: "Parabenize alguém com mensagens bonitas e variadas 🎊",
  commands: ["parabens", "felizdia", "congrats"],
  usage: `${PREFIX}parabens (@usuário ou responda a uma mensagem)`,

  handle: async ({
    isReply,
    webMessage,
    sendErrorReply,
    remoteJid,
    socket,
    userJid,
  }) => {
    try {
      let targetJid;
      const senderJid = userJid;
      const senderMention = `@${senderJid.split("@")[0]}`;

      // Detectar quem será parabenizado
      if (isReply) {
        const quoted = webMessage.message?.extendedTextMessage?.contextInfo;
        targetJid = quoted?.participant;
      } else {
        const mentions = webMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (mentions && mentions.length) {
          targetJid = mentions[0];
        }
      }

      if (!targetJid) {
        throw new InvalidParameterError("❌ Marque ou responda a pessoa que deseja parabenizar.");
      }

      const targetMention = `@${targetJid.split("@")[0]}`;

      // Mensagens com marcações dinâmicas
      const mensagens = [
        `🎉 *Parabéns, ${targetMention}!* 🎉\n\nQue hoje seja o início de um novo ciclo repleto de bênçãos, conquistas e sorrisos sinceros. Que a felicidade caminhe contigo todos os dias!💫\n\n💌 Com carinho, ${senderMention}`,
        `🎂 *Feliz aniversário, ${targetMention}!* 🎂\n\nQue você nunca perca a ✨esperança✨ nos dias bons e continue sendo essa pessoa iluminada que espalha alegria por onde passa,💖 Um novo ano de vida merece ser vivido com intensidade e gratidão👏!\n\n um abraço do seu amigo ${senderMention}`,
        `🎈 *Muitos anos de vida, ${targetMention}!* 🎈\n\n🎂 Muitas felicidades! 🎂\nQue todos os seus sonhos encontrem o caminho certo para se realizarem. Você merece tudo de melhor! 🌈 Que nunca falte luz, saúde e paz em sua vida.\n\n✨ Um carinho especial de ${senderMention}`,
        `🌟 *Parabéns, ${targetMention}!* 🌟\n\n🎈 Hoje é o seu dia! 🎈 Que você receba muito amor, abraços apertados e mensagens que aqueçam o coração. Continue brilhando e inspirando todos ao seu redor. 🥳 Aproveite cada segundo!\n\n🫂 Com afeto de ${senderMention}`,
        `🎊 *Felicidades, ${targetMention}!* 🎊\n\nQue este novo ano de vida seja marcado por realizações incríveis e momentos inesquecíveis! 🌟 Você é especial e merece toda a felicidade do mundo! 🎁\n\n💝 Abraços de ${senderMention}`,
        `🥳 *Parabéns, ${targetMention}!* 🥳\n\nMais um ano se inicia cheio de possibilidades! 🚀 Que você alcance tudo o que deseja e seja sempre essa pessoa maravilhosa! ✨ Aproveite muito seu dia! 🎂\n\n🤗 De coração, ${senderMention}`,
      ];

      // Obter histórico de mensagens usadas neste grupo
      let usedIndices = lastMessagesCache.get(remoteJid) || [];
      
      // Se já usamos todas as mensagens, resetar o histórico
      if (usedIndices.length >= mensagens.length) {
        usedIndices = [];
      }

      // Encontrar mensagens disponíveis (não usadas recentemente)
      let availableIndices = [];
      for (let i = 0; i < mensagens.length; i++) {
        if (!usedIndices.includes(i)) {
          availableIndices.push(i);
        }
      }

      // Se não há mensagens disponíveis (caso improvável), usar todas
      if (availableIndices.length === 0) {
        availableIndices = Array.from({ length: mensagens.length }, (_, i) => i);
        usedIndices = [];
      }

      // Escolher aleatoriamente entre as mensagens disponíveis
      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      const mensagem = mensagens[randomIndex];

      // Atualizar histórico
      usedIndices.push(randomIndex);
      lastMessagesCache.set(remoteJid, usedIndices);

      // Limpar cache antigo após 1 hora para não consumir muita memória
      setTimeout(() => {
        if (lastMessagesCache.has(remoteJid)) {
          lastMessagesCache.delete(remoteJid);
        }
      }, 60 * 60 * 1000);

      await socket.sendMessage(remoteJid, {
        text: mensagem,
        mentions: [targetJid, senderJid], // Marca ambos
      });

    } catch (err) {
      console.error("[/parabens] erro:", err);
      await sendErrorReply(err.message || "Erro ao parabenizar a pessoa.");
    }
  },
};