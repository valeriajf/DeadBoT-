const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { onlyNumbers } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "tinder",
  description: "Sistema de match estilo Tinder do grupo.",
  commands: ["tinder", "match", "dating"],
  usage: `${PREFIX}tinder`,
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
        "O Tinder só funciona em grupos! 💔"
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
          "Não há pessoas suficientes no grupo para o Tinder! 😢"
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
      
      // Bio aleatória
      const bios = [
        "Amo viajar e conhecer lugares novos ✈️",
        "Procuro algo sério 💕",
        "Aqui por diversão 😄",
        "Foodie e amante de séries 🍕📺",
        "Aventureiro por natureza 🏔️",
        "Amo animais e natureza 🐕🌱",
        "Workaholic mas sei me divertir 💼🎉",
        "Apaixonado por música 🎵",
        "Gamer nas horas vagas 🎮",
        "Vida fitness é vida 💪",
        "Coffee lover ☕",
        "Procuro minha alma gêmea 💫",
        "Sem drama, só diversão 🌈",
        "Amo cozinhar para quem eu amo 👨‍🍳"
      ];
      
      const randomBio = bios[Math.floor(Math.random() * bios.length)];

      // Interesses aleatórios
      const interests = [
        ["🎵", "🍕", "✈️"], ["💪", "🎮", "☕"], ["📚", "🌱", "🐕"],
        ["🏖️", "🎬", "🍷"], ["🏃‍♂️", "📷", "🎨"], ["🍰", "🎭", "🚗"]
      ];
      
      const randomInterests = interests[Math.floor(Math.random() * interests.length)];

      // Simula o "swipe" - 70% chance de dar match
      const isMatch = Math.random() > 0.3;

      if (isMatch) {
        // É UM MATCH! 
        const message = `💕 *IT'S A MATCH!* 💕\n\n` +
                       `🔥 Vocês deram match no Tinder! 🔥\n\n` +
                       `👤 @${userNumber} ❤️ @${candidateNumber}\n\n` +
                       `✨ *Perfil de @${candidateNumber}:*\n` +
                       `📍 ${distance}km de distância\n` +
                       `🎂 ${age} anos\n` +
                       `📝 "${randomBio}"\n` +
                       `🏷️ Interesses: ${randomInterests.join(' ')}\n\n` +
                       `💬 Que tal mandar a primeira mensagem? 😉\n` +
                       `🎉 Compatibility: ${Math.floor(Math.random() * 30) + 70}%`;

        await sendReply(message, [userJid, candidate]);

      } else {
        // Não deu match 😢
        const rejectMessages = [
          "Ops! Ela deu swipe left... 👈😅",
          "Não rolou dessa vez! 💔",
          "Ela não curtiu seu perfil... 😕",
          "Swipe left! Tenta de novo! ⬅️",
          "Sem match... Bora para a próxima! 🚶‍♂️"
        ];

        const rejectMessage = rejectMessages[Math.floor(Math.random() * rejectMessages.length)];

        const message = `💔 *TINDER* 💔\n\n` +
                       `👤 Você deu like em @${candidateNumber}\n\n` +
                       `✨ *Perfil:*\n` +
                       `📍 ${distance}km de distância\n` +
                       `🎂 ${age} anos\n` +
                       `📝 "${randomBio}"\n` +
                       `🏷️ ${randomInterests.join(' ')}\n\n` +
                       `${rejectMessage}\n\n` +
                       `💪 Continue tentando! Use o comando novamente!`;

        await sendReply(message, [candidate]);
      }

    } catch (error) {
      console.error('Erro no comando tinder:', error);
      await sendErrorReply(
        "Erro no Tinder! Talvez o servidor esteja fora do ar... 📱💔"
      );
    }
  },
};