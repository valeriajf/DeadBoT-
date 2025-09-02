/**
 * Comando para testar se o sistema está registrando atividade
 * Salve como: src/commands/member/testeativ.js
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "testeativ",
  description: "Testa se o sistema de atividade está funcionando",
  commands: ["testeativ", "testeatv"],
  usage: `${PREFIX}testeativ`,
  
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

      // Tenta carregar e usar o activityTracker
      try {
        const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);
        
        // Força o registro de uma mensagem
        activityTracker.trackMessage(remoteJid, userJid);
        
        // Força salvar os dados
        activityTracker.saveStats();
        
        // Obtém estatísticas
        const userStats = activityTracker.getUserStats(remoteJid, userJid);
        const groupStats = activityTracker.getGroupStats(remoteJid);
        const generalStats = activityTracker.getGeneralStats();
        
        let message = `🧪 *TESTE DE ATIVIDADE* 🧪\n\n`;
        message += `✅ Sistema funcionando!\n\n`;
        message += `👤 **SUAS STATS:**\n`;
        message += `• Mensagens: ${userStats.messages}\n`;
        message += `• Figurinhas: ${userStats.stickers}\n`;
        message += `• Total: ${userStats.total}\n\n`;
        
        message += `👥 **ESTE GRUPO:**\n`;
        message += `• Usuários registrados: ${Object.keys(groupStats).length}\n\n`;
        
        message += `🌍 **GERAL:**\n`;
        message += `• Grupos: ${generalStats.totalGroups}\n`;
        message += `• Usuários: ${generalStats.totalUsers}\n`;
        message += `• Mensagens: ${generalStats.totalMessages}\n`;
        message += `• Figurinhas: ${generalStats.totalStickers}\n\n`;
        
        message += `💡 Agora teste o #rankativo!`;
        
        await sendReply(message);
        
      } catch (trackerError) {
        await sendErrorReply(`❌ Erro no ActivityTracker: ${trackerError.message}`);
      }
      
    } catch (error) {
      console.error("Erro no teste de atividade:", error);
      await sendErrorReply(`❌ Erro geral: ${error.message}`);
    }
  },
};