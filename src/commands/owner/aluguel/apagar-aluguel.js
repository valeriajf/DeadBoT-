/**
 * Comando para apagar aluguel de grupo
 * Remove o registro de aluguel de um grupo usando o ID
 * 
 * @author Adaptado para DeadBoT
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const { apagarAluguel } = require(`${BASE_DIR}/utils/aluguel`);
const { isDono } = require(`${BASE_DIR}/utils/ownerCheck`);

module.exports = {
  name: "apagar-aluguel",
  description: "Apaga o aluguel de um grupo pelo ID",
  commands: ["apagar_aluguel", "del_aluguel", "deletaraluguel", "removeraluguel"],
  usage: `${PREFIX}apagar_aluguel <id>`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    args,
    sendSuccessReply,
    sendErrorReply,
    sendWarningReply,
    prefix,
    userJid
  }) => {
    // Verifica se é o dono do bot
    if (!isDono(userJid)) {
      await sendErrorReply("❌ Apenas o dono do bot pode usar este comando!");
      return;
    }

    const id = args[0];
    
    if (!id) {
      await sendWarningReply(
        `⚠️ *Uso correto:*\n${prefix}apagar_aluguel <id>\n\n` +
        `*Exemplo:*\n${prefix}apagar_aluguel ABC123\n\n` +
        `💡 *Dica:* Use ${prefix}listar_aluguel para ver os IDs disponíveis`
      );
      return;
    }

    try {
      const sucesso = apagarAluguel(id);

      if (sucesso) {
        await sendSuccessReply(
          `✅ *Aluguel removido com sucesso!*\n\n` +
          `🔑 *ID:* ${id}\n` +
          `📝 O grupo está livre para novo registro de aluguel.`
        );
      } else {
        await sendErrorReply(
          `❌ *Aluguel não encontrado!*\n\n` +
          `🔑 *ID informado:* ${id}\n\n` +
          `💡 *Dica:* Use ${prefix}listar_aluguel para ver os IDs válidos`
        );
      }
    } catch (error) {
      console.error("Erro ao apagar aluguel:", error);
      await sendErrorReply(
        `❌ *Erro ao apagar aluguel!*\n\n` +
        `Ocorreu um erro ao processar o comando.\n\n` +
        `Erro: ${error.message}`
      );
    }
  },
};
