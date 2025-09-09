/**
 * Comando para listar os 5 membros mais inativos do grupo (com 0 mensagens)
 * Lista membros que não enviaram nenhuma mensagem no período de contagem
 * Ignora administradores do grupo
 * 
 * @author VaL
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "rank-inativo",
  description: "Lista os 5 membros mais inativos do grupo com 0 mensagens",
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
      // Verificar se é um grupo
      if (!isGroup) {
        await sendWarningReact();
        return await sendReply("⚠️ Este comando só pode ser usado em grupos!");
      }

      await sendSuccessReact();

      // Carrega o activityTracker (mesma estrutura do rankativo)
      const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);

      // Pega os participantes do grupo
      const participants = await getGroupParticipants();
      
      // Obtém estatísticas do grupo atual
      const groupStats = activityTracker.getGroupStats(remoteJid);

      // Filtrar membros inativos (0 mensagens) - ignorando administradores
      const inactiveMembers = [];
      
      for (const participant of participants) {
        const userId = participant.id;
        const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
        
        // Ignorar administradores
        if (isAdmin) continue;
        
        // Verificar atividade do usuário
        const userData = groupStats[userId];
        const messages = userData ? (userData.messages || 0) : 0;
        const stickers = userData ? (userData.stickers || 0) : 0;
        const total = messages + stickers;
        
        // Só adicionar se tiver 0 mensagens/figurinhas
        if (total === 0) {
          // Usa a mesma função do rankativo para pegar o nome
          const displayName = activityTracker.getDisplayName(remoteJid, userId);
          
          inactiveMembers.push({
            userId,
            name: displayName,
            total: 0
          });
        }
      }

      // Verificar se há membros inativos
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

      // Limitar a 5 membros e embaralhar para variedade
      const shuffledInactive = inactiveMembers.sort(() => Math.random() - 0.5);
      const topInactive = shuffledInactive.slice(0, 5);

      // Emojis para o ranking
      const rankEmojis = ["💤", "😴", "🤐", "🙈", "👻"];
      
      // Array para as menções (igual ao rankativo)
      const mentions = [];
      
      // Construir mensagem do ranking
      let rankMessage = `
╭─「 😴 *RANK DOS INATIVOS* 😴 」
│
├ 📊 *Top 5 Membros Silenciosos*
├ 💬 Mensagens enviadas: *0*
│`;

      topInactive.forEach((member, index) => {
        const emoji = rankEmojis[index];
        
        // Usar a mesma estrutura de menção do rankativo
        const userMention = `@${member.userId.split('@')[0]}`;
        mentions.push(member.userId);
        
        rankMessage += `
├ ${emoji} *${index + 1}º* - ${userMention}`;
      });

      rankMessage += `
│
├ 💡 *Dica:* Que tal mandar um "Olá"?
├ 🎯 Total de inativos: *${inactiveMembers.length}*
├ 📈 Incentive a participação no grupo!
│
╰─「 *DeadBoT* 」`;

      // Enviar com menções (igual ao rankativo)
      await sendReply(rankMessage, mentions);

    } catch (error) {
      console.error("Erro no comando rank-inativo:", error);
      await sendErrorReact();
      await sendReply("❌ Ocorreu um erro ao buscar os membros inativos. Tente novamente mais tarde.");
    }
  },
};