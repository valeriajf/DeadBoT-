/**
 * Comando RankAtivo - Mostra os 5 membros mais ativos do grupo
 * Baseado no número de mensagens e figurinhas enviadas
 * 
 * @author Dev VaL
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "rankativo",
  description: "Mostra os 5 membros mais ativos do grupo",
  commands: ["rankativo", "rank", "ativo", "ranking"],
  usage: `${PREFIX}rankativo`,
  
  handle: async ({ 
    sendReply, 
    sendErrorReply, 
    sendWaitReply,
    getGroupParticipants,
    socket,
    remoteJid,
    userJid,
    isGroup 
  }) => {
    try {
      // Verifica se está em um grupo
      if (!isGroup) {
        return await sendErrorReply("❌ Este comando só funciona em grupos!");
      }

      await sendWaitReply("📊 Calculando ranking de atividade...");

      // Carrega o activityTracker
      const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);

      // Pega os participantes do grupo
      const participants = await getGroupParticipants();
      
      // Obtém estatísticas do grupo atual
      const groupStats = activityTracker.getGroupStats(remoteJid);
      
      if (Object.keys(groupStats).length === 0) {
        return await sendReply(`📊 *RANKING DE ATIVIDADE* 📊

❌ Ainda não há dados de atividade neste grupo.

💡 *Como funciona:*
• O bot coleta dados de mensagens e figurinhas automaticamente
• Continue enviando mensagens e figurinhas
• Execute o comando novamente em alguns minutos!`);
      }

      // Cria array com dados dos membros ativos
      const activeMembers = [];
      
      for (const [userId, userData] of Object.entries(groupStats)) {
        // Verifica se o usuário ainda está no grupo
        const isStillInGroup = participants.some(p => p.id === userId);
        
        if (isStillInGroup) {
          // Usa o nome salvo pelo sistema ou formata o número
          const displayName = activityTracker.getDisplayName(remoteJid, userId);

          const messages = userData.messages || 0;
          const stickers = userData.stickers || 0;
          const total = messages + stickers;

          activeMembers.push({
            userId,
            name: displayName,
            messages,
            stickers,
            total,
            hasRealName: userData.displayName || userData.lastKnownName
          });
        }
      }

      // Ordena por atividade total (mensagens + figurinhas)
      activeMembers.sort((a, b) => b.total - a.total);

      // Pega apenas os top 5 (ou quantos tiver)
      const topMembers = activeMembers.slice(0, Math.min(5, activeMembers.length));

      if (topMembers.length === 0) {
        return await sendReply(`📊 *RANKING DE ATIVIDADE* 📊

❌ Nenhum usuário ativo encontrado no momento.

💡 Continue enviando mensagens e figurinhas para aparecer no ranking!`);
      }

      // Monta a mensagem do ranking
      let rankingMessage = `🏆 *RANKING DE ATIVIDADE* 🏆\n`;
      
      try {
        const groupMetadata = await socket.groupMetadata(remoteJid);
        rankingMessage += `📅 *Grupo:* ${groupMetadata.subject}\n\n`;
      } catch (error) {
        rankingMessage += `📅 *Grupo:* ${remoteJid.split('@')[0]}\n\n`;
      }

      // Emojis para as posições
      const positionEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

      // Array para as menções
      const mentions = [];

      topMembers.forEach((member, index) => {
        const position = positionEmojis[index] || `${index + 1}️⃣`;
        
        // Calcula porcentagem baseada no primeiro lugar
        const topScore = topMembers[0].total;
        const percentage = topScore > 0 ? ((member.total / topScore) * 100).toFixed(1) : 0;
        
        // Adiciona emoji de perfil se tiver nome real
        const namePrefix = member.hasRealName ? "👤" : "";
        
        // Adiciona a menção do usuário (sem repetir o nome)
        const userMention = `@${member.userId.split('@')[0]}`;
        mentions.push(member.userId);
        
        rankingMessage += `${position} ${namePrefix}${userMention}\n`;
        rankingMessage += `   📝 ${member.messages} mensagens\n`;
        rankingMessage += `   🎭 ${member.stickers} figurinhas\n`;
        rankingMessage += `   📊 ${member.total} total (${percentage}%)\n\n`;
      });

      // Estatísticas gerais do bot
      const generalStats = activityTracker.getGeneralStats();
      rankingMessage += `🌍 *ESTATÍSTICAS GLOBAIS:*\n`;
      rankingMessage += `👤 ${generalStats.totalUsers} usuários ativos\n`;
      rankingMessage += `💬 ${generalStats.totalMessages} mensagens globais\n`;
      rankingMessage += `🎭 ${generalStats.totalStickers} figurinhas globais`;

      await sendReply(rankingMessage, mentions);

    } catch (error) {
      console.error("Erro no comando rankativo:", error);
      await sendErrorReply(`❌ Erro ao gerar ranking de atividade: ${error.message}`);
    }
  },
};
