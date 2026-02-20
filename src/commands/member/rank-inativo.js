/**
 * Comando para listar os 5 membros mais inativos do grupo (com 0 atividade)
 * Lista membros que não enviaram nenhuma mensagem, figurinha, comando ou áudio
 * Ignora administradores do grupo
 * 
 * @author Dev VaL
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "rank-inativo",
  description: "Lista os 5 membros mais inativos do grupo com 0 atividade",
  commands: ["rank-inativo", "rankinativo", "inativos"],
  usage: `${PREFIX}rank-inativo`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    sendSuccessReact,
    sendWarningReact,
    sendErrorReact,
    sendReply,
    remoteJid,
    baileysMessage,
    isGroup,
    getGroupParticipants,
    socket
  }) => {
    try {
      if (!isGroup) {
        await sendWarningReact();
        return await sendReply("⚠️ Este comando só pode ser usado em grupos!");
      }

      await sendSuccessReact();

      const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);
      const participants = await getGroupParticipants();
      const groupStats = activityTracker.getGroupStats(remoteJid);

      // Contadores para estatísticas do grupo
      let groupTotalUsers = 0;
      let groupTotalMessages = 0;
      let groupTotalStickers = 0;
      let groupTotalCommands = 0;
      let groupTotalAudios = 0;

      // Calcular estatísticas do grupo (apenas membros ainda no grupo)
      for (const participant of participants) {
        const userId = participant.id;
        const userData = groupStats[userId];
        if (userData) {
          groupTotalUsers++;
          groupTotalMessages += userData.messages || 0;
          groupTotalStickers += userData.stickers || 0;
          groupTotalCommands += userData.commands || 0;
          groupTotalAudios += userData.audios || 0;
        }
      }

      // Filtrar membros inativos - ignorando administradores
      const inactiveMembers = [];
      
      for (const participant of participants) {
        const userId = participant.id;
        const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
        
        if (isAdmin) continue;
        
        const userData = groupStats[userId];
        const messages = userData ? (userData.messages || 0) : 0;
        const stickers = userData ? (userData.stickers || 0) : 0;
        const commands = userData ? (userData.commands || 0) : 0;
        const audios = userData ? (userData.audios || 0) : 0;
        const total = messages + stickers + commands + audios;
        
        if (total === 0) {
          const displayName = activityTracker.getDisplayName(remoteJid, userId);
          
          inactiveMembers.push({
            userId,
            name: displayName,
            total: 0
          });
        }
      }

      if (inactiveMembers.length === 0) {
        return await sendReply(`
╭─「 🎉 *GRUPO ATIVO* 🎉 」
│
├ ✅ *Parabéns!*
├ 👥 Todos os membros já enviaram mensagens
├ 🏆 Não há membros completamente inativos
├ 💪 Continue incentivando a participação!
│
╰─「 *DeadBoT* 」`);
      }

      // Embaralhar e limitar a 5
      const shuffledInactive = inactiveMembers.sort(() => Math.random() - 0.5);
      const topInactive = shuffledInactive.slice(0, 5);

      const positionEmojis = ["💤", "😴", "🤐", "🙈", "👻"];
      const mentions = [];
      
      let rankMessage = `😴 *RANKING DE INATIVIDADE* 😴\n`;
      
      try {
        const groupMetadata = await socket.groupMetadata(remoteJid);
        rankMessage += `📅 *Grupo:* ${groupMetadata.subject}\n\n`;
      } catch (error) {
        rankMessage += `📅 *Grupo:* ${remoteJid.split('@')[0]}\n\n`;
      }

      topInactive.forEach((member, index) => {
        const emoji = positionEmojis[index];
        const userMention = `@${member.userId.split('@')[0]}`;
        mentions.push(member.userId);
        
        rankMessage += `${emoji} 👤${userMention}\n`;
        rankMessage += `   📝 0 mensagens\n`;
        rankMessage += `   🎭 0 figurinhas\n`;
        rankMessage += `   🎮 0 comandos\n`;
        rankMessage += `   🎤 0 áudios\n`;
        rankMessage += `   📊 0 total (0.0%)\n\n`;
      });

      // Estatísticas do grupo atual
      rankMessage += `🌍 *ESTATÍSTICAS DO GRUPO:*\n`;
      rankMessage += `👥 ${groupTotalUsers} usuários ativos\n`;
      rankMessage += `💬 ${groupTotalMessages} mensagens enviadas\n`;
      rankMessage += `🎭 ${groupTotalStickers} figurinhas enviadas\n`;
      rankMessage += `🎮 ${groupTotalCommands} comandos enviados\n`;
      rankMessage += `🎤 ${groupTotalAudios} áudios enviados`;

      await sendReply(rankMessage, mentions);

    } catch (error) {
      console.error("Erro no comando rank-inativo:", error);
      await sendErrorReact();
      await sendReply("❌ Ocorreu um erro ao buscar os membros inativos. Tente novamente mais tarde.");
    }
  },
};
