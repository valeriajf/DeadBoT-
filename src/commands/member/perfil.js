const { toUserJidOrLid, isGroup } = require(`${BASE_DIR}/utils`);
const { errorLog } = require(`${BASE_DIR}/utils/logger`);

const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { getProfileImageData } = require(`${BASE_DIR}/services/baileys`);

module.exports = {
  name: "perfil",
  description: "Mostra informações de um usuário",
  commands: ["perfil", "profile"],
  usage: `${PREFIX}perfil ou perfil @usuario`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    args,
    socket,
    remoteJid,
    userJid,
    sendErrorReply,
    sendWaitReply,
    sendSuccessReact,
    getGroupParticipants
  }) => {
    if (!isGroup(remoteJid)) {
      throw new InvalidParameterError(
        "Este comando só pode ser usado em grupo."
      );
    }

    const targetJid = args[0] ? toUserJidOrLid(args[0]) : userJid;

    await sendWaitReply("Carregando perfil...");

    try {
      let profilePicUrl;
      let userName;
      let userRole = "Membro";

      try {
        const { profileImage } = await getProfileImageData(socket, targetJid);
        profilePicUrl = profileImage || `${ASSETS_DIR}/images/default-user.png`;

        const contactInfo = await socket.onWhatsApp(targetJid);
        userName = contactInfo[0]?.name || "Usuário Desconhecido";
      } catch (error) {
        errorLog(
          `Erro ao tentar pegar dados do usuário ${targetJid}: ${JSON.stringify(
            error,
            null,
            2
          )}`
        );
        profilePicUrl = `${ASSETS_DIR}/images/default-user.png`;
      }

      const groupMetadata = await socket.groupMetadata(remoteJid);

      const participant = groupMetadata.participants.find(
        (participant) => participant.id === targetJid
      );

      if (participant?.admin) {
        userRole = "Administrador";
      }

      // ==============================
      // 📊 PUXAR DADOS DO ACTIVITYTRACKER
      // ==============================

      const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);
      const groupStats = activityTracker.getGroupStats(remoteJid);

      let messages = 0;
      let stickers = 0;
      let rankPosition = "—";

      if (groupStats[targetJid]) {
        messages = groupStats[targetJid].messages || 0;
        stickers = groupStats[targetJid].stickers || 0;
      }

      // Montar ranking igual ao rankativo
      const participantsList = await getGroupParticipants();
      const activeMembers = [];

      for (const [userId, userData] of Object.entries(groupStats)) {
        const isStillInGroup = participantsList.some(p => p.id === userId);
        if (!isStillInGroup) continue;

        const msgs = userData.messages || 0;
        const stks = userData.stickers || 0;
        const total = msgs + stks;

        activeMembers.push({
          userId,
          total
        });
      }

      // Ordena
      activeMembers.sort((a, b) => b.total - a.total);

      // Descobre posição do usuário
      const index = activeMembers.findIndex(u => u.userId === targetJid);
      if (index !== -1) {
        rankPosition = `${index + 1}º`;
      }

      // ==============================
      // 🎲 ATRIBUTOS ALEATÓRIOS
      // ==============================

      const randomPercent = () => Math.floor(Math.random() * 100) + 1;
      const programPrice = (Math.random() * 5000 + 1000).toFixed(2);

      const beautyLevel = randomPercent();
      const gadoLevel = randomPercent();
      const passivaLevel = randomPercent();
      const charisma = randomPercent();
      const humor = randomPercent();
      const intelligence = randomPercent();
      const courage = randomPercent();
      const luck = randomPercent();
      const romanticLevel = randomPercent();
      const loyalty = randomPercent();
      const flirtSkill = randomPercent();
      const laziness = randomPercent();
      const creativity = randomPercent();

      // ==============================
      // 🧾 MENSAGEM FINAL
      // ==============================

      const mensagem = `
👤 *Nome:* @${targetJid.split("@")[0]}
🎖️ *Cargo:* ${userRole}

📝 ${messages} mensagens
🎭 ${stickers} figurinhas
🏆  Rank Ativo: ${rankPosition}

🌚 *Programa:* R$ ${programPrice}
🐮 *Gado:* ${gadoLevel}%
🎱 *Passiva:* ${passivaLevel}%
✨ *Beleza:* ${beautyLevel}%
🎭 *Carisma:* ${charisma}%
😂 *Humor:* ${humor}%
🧠 *Inteligência:* ${intelligence}%
💪 *Coragem:* ${courage}%
🍀 *Sorte:* ${luck}%
💕 *Romântico:* ${romanticLevel}%
🦁 *Lealdade:* ${loyalty}%
😏 *Pegador:* ${flirtSkill}%
😴 *Preguiça:* ${laziness}%
🎨 *Criatividade:* ${creativity}%`;

      const mentions = [targetJid];

      await sendSuccessReact();

      await socket.sendMessage(remoteJid, {
        image: { url: profilePicUrl },
        caption: mensagem,
        mentions: mentions,
      });

    } catch (error) {
      console.error(error);
      sendErrorReply("Ocorreu um erro ao tentar verificar o perfil.");
    }
  },
};