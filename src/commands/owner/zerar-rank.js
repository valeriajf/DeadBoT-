/**
 * Comando para zerar o ranking de atividade
 * @author Val (DeadBoT)
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "zerar-rank",
  description: "Zera o ranking de atividade do grupo atual ou globalmente",
  commands: ["zerar-rank", "resetrank", "limpar-rank"],
  usage: `${PREFIX}zerar-rank [global]`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    sendReply, 
    sendSuccessReply,
    sendErrorReply,
    args,
    remoteJid,
    isGroup
  }) => {
    const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);
    
    if (!isGroup && !args.includes('global')) {
      throw new InvalidParameterError("Use este comando em um grupo ou adicione 'global' para zerar tudo!");
    }

    if (args.includes('global')) {
      // Zera todos os dados globalmente
      activityTracker.stats = {};
      activityTracker.saveStats();
      
      await sendSuccessReply(`Ranking zerado globalmente! Todos os dados de atividade foram apagados.`);
      
    } else {
      // Zera apenas o grupo atual
      if (activityTracker.stats[remoteJid]) {
        delete activityTracker.stats[remoteJid];
        activityTracker.saveStats();
      }
      
      await sendSuccessReply(`Ranking deste grupo zerado com sucesso!`);
    }
  },
};