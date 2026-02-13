/**
 * Comando para listar todos os aluguéis ativos
 * Mostra informações detalhadas de cada grupo alugado
 * 
 * @author Adaptado para DeadBoT
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const { listarAlugueis, calcularTempoRestante } = require(`${BASE_DIR}/utils/aluguel`);
const { isDono } = require(`${BASE_DIR}/utils/ownerCheck`);

module.exports = {
  name: "listar-aluguel",
  description: "Lista todos os aluguéis ativos, mostrando nome do grupo e ID do aluguel",
  commands: ["listar_aluguel", "listaraluguel", "listaluguel"],
  usage: `${PREFIX}listar_aluguel`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    sendReply,
    prefix,
    userJid
  }) => {
    // Verifica se é o dono do bot
    if (!isDono(userJid)) {
      await sendReply("❌ Apenas o dono do bot pode usar este comando!");
      return;
    }

    try {
      const alugueis = listarAlugueis();
      const grupos = Object.keys(alugueis);
      
      if (grupos.length === 0) {
        await sendReply("📊 *Nenhum aluguel ativo no momento.*");
        return;
      }

      let mensagem = "📋 *ALUGUÉIS ATIVOS*\n\n";
      mensagem += `Total: ${grupos.length} grupo(s)\n`;
      mensagem += "━━━━━━━━━━━━━━━━━━\n\n";

      for (const groupId of grupos) {
        const aluguel = alugueis[groupId];
        const nomeGrupo = aluguel.nomeGrupo || "Grupo sem nome";
        const tempoRestante = calcularTempoRestante(aluguel.expiraTimestamp);

        mensagem += `🪀 *Nome:* ${nomeGrupo}\n`;
        mensagem += `🆔 *ID do grupo:* ${groupId}\n`;
        mensagem += `🔑 *ID do aluguel:* ${aluguel.id}\n`;
        mensagem += `⏱️ *Tempo contratado:* ${aluguel.duracao}\n`;
        mensagem += `⌛ *Tempo restante:* ${tempoRestante}\n`;
        mensagem += `📅 *Vencimento:* ${aluguel.expira}\n`;
        mensagem += "━━━━━━━━━━━━━━━━━━\n\n";
      }

      mensagem += `💡 *Dica:* Use ${prefix}apagar_aluguel <id> para remover um aluguel`;

      await sendReply(mensagem);
    } catch (error) {
      console.error("❌ Erro ao listar aluguéis:", error);
      await sendReply(
        `❌ *Erro ao listar aluguéis!*\n\n` +
        `Ocorreu um erro ao processar o comando.\n\n` +
        `Erro: ${error.message}`
      );
    }
  },
};
