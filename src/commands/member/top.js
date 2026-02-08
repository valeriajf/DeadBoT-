// @author: VaL

const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "top",
  description: "Parabenize membros por postagens relevantes e contribuições valiosas 🌟",
  commands: ["top", "toppost", "excelente"],
  usage: `${PREFIX}top (@usuário ou responda a uma mensagem)`,

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
        throw new InvalidParameterError("❌ Marque ou responda a pessoa que deseja parabenizar pela postagem.");
      }

      const targetMention = `@${targetJid.split("@")[0]}`;

      // Mensagens com marcações dinâmicas
      const mensagens = [
        `🌟 *TOP, ${targetMention}!* 🌟\n\n👏 Que postagem incrível! Sua contribuição realmente fez a diferença no grupo. Continue assim, você é um exemplo para todos nós! 💪✨\n\n🎯 Reconhecido por ${senderMention}`,
        
        `🏆 *EXCELENTE, ${targetMention}!* 🏆\n\n🎊 Parabéns pela postagem de qualidade! Conteúdo assim enriquece nosso grupo e agrega muito valor. Você é TOP demais! 🔥💎\n\n👊 Valorizado por ${senderMention}`,
        
        `⭐ *SHOW DE BOLA, ${targetMention}!* ⭐\n\n🎯 Essa postagem foi sensacional! Você realmente sabe como contribuir com conteúdo relevante. O grupo agradece sua dedicação! 🙌✨\n\n💫 Aplaudido por ${senderMention}`,
        
        `💎 *MANDOU BEM, ${targetMention}!* 💎\n\n🚀 Que conteúdo de qualidade! Sua postagem demonstra conhecimento e comprometimento. Continue compartilhando essa energia positiva! 💪🌈\n\n🎖️ Prestigiado por ${senderMention}`,
        
        `🎯 *IMPECÁVEL, ${targetMention}!* 🎯\n\n✨ Postagem de altíssimo nível! Você elevou o padrão do grupo com esse conteúdo. Sua contribuição é muito valiosa! 🏅💡\n\n🌟 Elogiado por ${senderMention}`,
        
        `🔥 *ARRASOU, ${targetMention}!* 🔥\n\n👑 Que postagem espetacular! Você provou mais uma vez que é referência em contribuições de qualidade. O grupo está de parabéns por ter você! 🎊🌠\n\n💪 Reconhecido por ${senderMention}`,
        
        `🌈 *NOTA 10, ${targetMention}!* 🌈\n\n🎉 Sua postagem foi simplesmente perfeita! Conteúdo relevante, útil e bem elaborado. Você faz a diferença aqui! 🌟💯\n\n👏 Admirado por ${senderMention}`,
        
        `💫 *BRILHOU, ${targetMention}!* 💫\n\n🎪 Que postagem incrível! Você sempre sabe como agregar valor ao grupo. Sua dedicação é inspiradora! ⚡🏆\n\n🎯 Celebrado por ${senderMention}`,
        
        `🏅 *MAESTRIA, ${targetMention}!* 🏅\n\n🌟 Postagem de mestre! Você domina o assunto e sabe como compartilhar conhecimento. O grupo todo aprende com você! 📚✨\n\n🎓 Homenageado por ${senderMention}`,
        
        `⚡ *SENSACIONAL, ${targetMention}!* ⚡\n\n🎊 Essa postagem merece todos os elogios! Conteúdo rico, relevante e extremamente útil. Você é TOP DEMAIS! 🔝💎\n\n🌠 Ovacionado por ${senderMention}`,
        
        `🎖️ *EXEMPLAR, ${targetMention}!* 🎖️\n\n💡 Que contribuição fantástica! Sua postagem é exatamente o tipo de conteúdo que precisamos mais no grupo. Continue sendo essa referência! 🌟🚀\n\n👑 Aclamado por ${senderMention}`,
        
        `🌠 *DESTAQUE, ${targetMention}!* 🌠\n\n🎯 Postagem de destaque absoluto! Você sempre traz conteúdo de qualidade superior. O grupo todo reconhece seu valor! 💪✨\n\n🏆 Parabenizado por ${senderMention}`,
        
        `🔝 *NO TOPO, ${targetMention}!* 🔝\n\n🎉 Você está no topo com essa postagem! Conteúdo de primeira, que agrega muito ao grupo. Parabéns pela excelência! 💎🌟\n\n⭐ Enaltecido por ${senderMention}`,
        
        `💪 *POTÊNCIA, ${targetMention}!* 💪\n\n🚀 Que postagem poderosa! Você demonstrou total domínio do assunto. Continue compartilhando esse conhecimento valioso! 🔥💫\n\n🎊 Reverenciado por ${senderMention}`,
        
        `🌟 *FENOMENAL, ${targetMention}!* 🌟\n\n🎭 Postagem fenomenal! Você tem o dom de criar conteúdo que realmente importa. O grupo todo se beneficia das suas contribuições! 🏅✨\n\n💝 Aplaudido de pé por ${senderMention}`,
      ];

      const mensagem = mensagens[Math.floor(Math.random() * mensagens.length)];

      await socket.sendMessage(remoteJid, {
        text: mensagem,
        mentions: [targetJid, senderJid], // Marca ambos
      });

    } catch (err) {
      console.error("[/top] erro:", err);
      await sendErrorReply(err.message || "Erro ao parabenizar a postagem.");
    }
  },
};