// @author: VaL

const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

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
        `🎈 *Muitos anos de vida, ${targetMention}!* 🎈\n\n🎂 Muitas felicidades! 🎂
        Que todos os seus sonhos encontrem o caminho certo para se realizarem. Você merece tudo de melhor! 🌈 Que nunca falte luz, saúde e paz em sua vida.\n\n✨ Um carinho especial de ${senderMention}`,
        `🌟 *Parabéns, ${targetMention}!* 🌟\n\n🎈 Hoje é o seu dia! 🎈 Que você receba muito amor, abraços apertados e mensagens que aqueçam o coração. Continue brilhando e inspirando todos ao seu redor. 🥳 Aproveite cada segundo!\n\n🫂 Com afeto de ${senderMention}`,
      ];

      const mensagem = mensagens[Math.floor(Math.random() * mensagens.length)];

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