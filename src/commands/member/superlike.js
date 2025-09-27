const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { onlyNumbers } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "superlike",
  description: "Super Like no Tinder - maiores chances de match!",
  commands: ["superlike", "superl", "sl"],
  usage: `${PREFIX}superlike`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    sendReply,
    sendErrorReply,
    userJid,
    isGroup,
    socket,
    remoteJid,
  }) => {
    if (!isGroup) {
      await sendErrorReply(
        "O Super Like só funciona em grupos! 💙"
      );
      return;
    }

    try {
      // Busca metadados do grupo
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const participants = groupMetadata.participants
        .map(p => p.id)
        .filter(id => id !== userJid) // Remove o próprio usuário
        .filter(id => !id.includes(':0@')); // Remove bots

      if (participants.length < 1) {
        await sendErrorReply(
          "Não há pessoas suficientes no grupo para o Super Like! 😢"
        );
        return;
      }

      const userNumber = onlyNumbers(userJid);

      // Seleciona uma pessoa aleatória para "aparecer" no Tinder
      const candidate = participants[Math.floor(Math.random() * participants.length)];
      const candidateNumber = onlyNumbers(candidate);

      // Gera características aleatórias do "perfil"
      const age = Math.floor(Math.random() * 15) + 18; // 18-32 anos
      const distance = Math.floor(Math.random() * 20) + 1; // 1-20 km
      
      // Bio aleatória mais especial para Super Like
      const superBios = [
        "Procurando algo real e duradouro 💍",
        "Pessoa incrível que ama a vida 🌟",
        "Sonhadora, aventureira e apaixonada 💫",
        "Mente brilhante e coração gigante ❤️",
        "Artista da vida, criativo e único 🎨",
        "Alma livre que espalha alegria 🦋",
        "Intelectual, engraçado e carinhoso 📚💕",
        "Viajante do mundo e colecionador de sorrisos ✈️😊",
        "Chef do amor e especialista em abraços 👨‍🍳🤗",
        "Workaholic que sabe amar intensamente 💼❤️",
        "Esportista que joga limpo no amor 🏃‍♂️💕",
        "Músico da vida, toca o coração 🎵💖",
        "Gamer que quer co-op na vida real 🎮👫",
        "Fitness e alma fit para relacionamento sério 💪💑"
      ];
      
      const randomBio = superBios[Math.floor(Math.random() * superBios.length)];

      // Interesses premium para Super Like
      const premiumInterests = [
        ["💎", "🥂", "✈️"], ["🌹", "🎭", "🏖️"], ["🎯", "🎨", "🍾"],
        ["👑", "🎪", "🦋"], ["⭐", "🎵", "💫"], ["🔥", "🌟", "💖"]
      ];
      
      const randomInterests = premiumInterests[Math.floor(Math.random() * premiumInterests.length)];

      // Super Like tem 90% de chance de dar match (muito maior que o normal!)
      const isMatch = Math.random() > 0.1;

      if (isMatch) {
        // É UM SUPER MATCH! 
        const compatibility = Math.floor(Math.random() * 20) + 80; // 80-100%
        
        const superMessages = [
          "🤩 ELA FICOU IMPRESSIONADA COM SEU SUPER LIKE!",
          "💙 SEU SUPER LIKE CONQUISTOU O CORAÇÃO DELA!",
          "⭐ SUPER LIKE = SUPER RESULTADO!",
          "🎯 SUPER LIKE CERTEIRO!"
        ];
        
        const superMessage = superMessages[Math.floor(Math.random() * superMessages.length)];

        const message = `💙 *SUPER MATCH!* 💙\n\n` +
                       `⭐ ${superMessage} ⭐\n\n` +
                       `🔥 MATCH EXPLOSIVO! 🔥\n` +
                       `👤 @${userNumber} 💙 @${candidateNumber}\n\n` +
                       `✨ *Perfil Premium de @${candidateNumber}:*\n` +
                       `📍 ${distance}km de distância\n` +
                       `🎂 ${age} anos\n` +
                       `📝 "${randomBio}"\n` +
                       `🏷️ Interesses VIP: ${randomInterests.join(' ')}\n\n` +
                       `💫 Super Compatibility: *${compatibility}%*\n\n` +
                       `🎉 Parabéns! O Super Like funcionou perfeitamente!\n` +
                       `💌 Ela já está esperando sua mensagem!`;

        await sendReply(message, [userJid, candidate]);

      } else {
        // Mesmo com Super Like não deu match (raríssimo - 10%)
        const message = `💙 *SUPER LIKE USADO* 💙\n\n` +
                       `⭐ Você deu SUPER LIKE em @${candidateNumber}!\n\n` +
                       `✨ *Perfil Premium:*\n` +
                       `📍 ${distance}km de distância\n` +
                       `🎂 ${age} anos\n` +
                       `📝 "${randomBio}"\n` +
                       `🏷️ ${randomInterests.join(' ')}\n\n` +
                       `😔 Infelizmente ela não retribuiu...\n` +
                       `💪 Mas não desista! Você usou seu melhor movimento!\n\n` +
                       `🔥 *Dica:* Super Likes têm 90% de sucesso!`;

        await sendReply(message, [candidate]);
      }

    } catch (error) {
      console.error('Erro no comando superlike:', error);
      await sendErrorReply(
        "Erro no Super Like! O Tinder está fora do ar... 💙💔"
      );
    }
  },
};