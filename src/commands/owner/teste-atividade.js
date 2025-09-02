/**
 * Comando para testar se o sistema de rastreamento está funcionando
 * Salve como: src/commands/owner/testeatividade.js
 * 
 * @author Val (DeadBoT)
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);

module.exports = {
  name: "testeatividade",
  description: "Testa se o sistema de rastreamento de atividade está funcionando",
  commands: ["testeatividade", "testrank", "debugrank"],
  usage: `${PREFIX}testeatividade`,
  
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    sendReply, 
    sendErrorReply,
    remoteJid,
    userJid,
    isGroup 
  }) => {
    try {
      if (!isGroup) {
        return await sendErrorReply("❌ Este comando só funciona em grupos!");
      }

      // Testa se o tracker está funcionando
      let message = `🔧 *TESTE DO SISTEMA DE ATIVIDADE* 🔧\n\n`;

      // Verifica se o tracker existe
      if (!activityTracker) {
        message += `❌ **ERRO:** Sistema de rastreamento não encontrado!\n`;
        message += `💡 Verifique se o middleware foi adicionado ao loader.\n`;
        return await sendReply(message);
      }

      // Obtém estatísticas gerais
      const generalStats = activityTracker.getGeneralStats();
      message += `📊 **ESTATÍSTICAS GERAIS:**\n`;
      message += `• Grupos monitorados: ${generalStats.totalGroups}\n`;
      message += `• Usuários ativos: ${generalStats.totalUsers}\n`;
      message += `• Total de mensagens: ${generalStats.totalMessages}\n`;
      message += `• Total de figurinhas: ${generalStats.totalStickers}\n`;
      message += `• Interações totais: ${generalStats.totalInteractions}\n\n`;

      // Obtém estatísticas do grupo atual
      const groupStats = activityTracker.getGroupStats(remoteJid);
      const userCount = Object.keys(groupStats).length;
      
      message += `👥 **ESTE GRUPO:**\n`;
      message += `• Usuários com dados: ${userCount}\n`;

      if (userCount > 0) {
        // Mostra os 3 usuários mais ativos
        const topUsers = activityTracker.getTopUsers(remoteJid, 3);
        message += `• Top 3 mais ativos:\n`;
        topUsers.forEach((user, index) => {
          const phone = user.userJid.split('@')[0];
          message += `  ${index + 1}. ${phone}: ${user.messages}msg + ${user.stickers}fig = ${user.total}\n`;
        });
      } else {
        message += `• ⚠️ Nenhum dado coletado ainda neste grupo\n`;
      }

      // Testa se consegue registrar atividade
      message += `\n🧪 **TESTE DE REGISTRO:**\n`;
      
      // Simula registro de mensagem
      activityTracker.trackMessage(remoteJid, userJid);
      const userStats = activityTracker.getUserStats(remoteJid, userJid);
      
      message += `• Mensagens suas: ${userStats.messages}\n`;
      message += `• Figurinhas suas: ${userStats.stickers}\n`;
      message += `• Total seu: ${userStats.total}\n\n`;

      message += `✅ **SISTEMA FUNCIONANDO!**\n`;
      message += `💡 Envie mensagens e figurinhas, depois teste o #rankativo novamente!`;

      await sendReply(message);

    } catch (error) {
      console.error("Erro no teste de atividade:", error);
      await sendErrorReply(`❌ Erro no teste: ${error.message}`);
    }
  },
};