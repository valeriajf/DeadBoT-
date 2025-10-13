/**
 * Comando para zerar o ranking de atividade
 * Salve como: src/commands/owner/zerar-rank.js
 * 
 * @author Dev VaL 
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "zerar-rank",
  description: "Zera o ranking de atividade do grupo atual ou globalmente",
  commands: ["zerar-rank", "resetrank", "limpar-rank"],
  usage: `${PREFIX}zerar-rank [global]`,
  
  handle: async ({ 
    sendReply, 
    sendErrorReply,
    args,
    remoteJid,
    isGroup 
  }) => {
    try {
      const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);
      
      if (!isGroup && !args.includes('global')) {
        return await sendErrorReply("❌ Use este comando em um grupo ou adicione 'global' para zerar tudo!");
      }

      if (args.includes('global')) {
        // Zera todos os dados globalmente
        activityTracker.stats = {};
        activityTracker.saveStats();
        
        await sendReply(`🗑️ *RANKING ZERADO GLOBALMENTE* 🗑️

✅ Todos os dados de atividade foram apagados de todos os grupos!

O sistema continuará coletando novos dados automaticamente.`);
        
      } else {
        // Zera apenas o grupo atual
        if (activityTracker.stats[remoteJid]) {
          delete activityTracker.stats[remoteJid];
          activityTracker.saveStats();
        }
        
        await sendReply(`🗑️ *RANKING ZERADO NESTE GRUPO* 🗑️

✅ Todos os dados de atividade deste grupo foram apagados!

O sistema continuará coletando novos dados automaticamente.

💡 Para zerar dados globais use: ${PREFIX}zerar-rank global`);
      }

    } catch (error) {
      console.error("Erro ao zerar ranking:", error);
      await sendErrorReply(`❌ Erro ao zerar ranking: ${error.message}`);
    }
  },
};