/**
 * Comando para listar todos os aluguéis ativos
 * Mostra informações detalhadas de cada grupo alugado
 * 
 * @author Adaptado para DeadBoT
 */
const path = require("node:path");
const { PREFIX } = require(path.join(__dirname, "..", "..", "..", "config"));
const { listarAlugueis } = require(path.join(__dirname, "..", "..", "..", "utils", "aluguel"));
const { isDono } = require(path.join(__dirname, "..", "..", "..", "utils", "ownerCheck"));

module.exports = {
  name: "listar-alugueis",
  description: "Lista todos os aluguéis ativos, mostrando nome do grupo e ID do aluguel",
  commands: ["listar_alugueis", "alugueis", "listaralugueis"],
  usage: `${PREFIX}listar_alugueis`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    sendReply,
    sendErrorReply,
    getGroupMetadata,
    prefix,
    userJid
  }) => {
    // Verifica se é o dono do bot
    if (!isDono(userJid)) {
      await sendErrorReply("❌ Apenas o dono do bot pode usar este comando!");
      return;
    }

    try {
      const alugueis = listarAlugueis();
      const grupos = Object.keys(alugueis);
      
      if (grupos.length === 0) {
        await sendErrorReply("❌ Nenhum aluguel ativo no momento.");
        return;
      }

      let mensagem = "📋 *Aluguéis Ativos*\n\n";
      mensagem += `Total: ${grupos.length} grupo(s)\n`;
      mensagem += "━━━━━━━━━━━━━━━━━━\n\n";

      for (const groupId of grupos) {
        const aluguel = alugueis[groupId];
        let nomeGrupo = "Grupo desconhecido";

        try {
          const metadata = await getGroupMetadata(groupId);
          nomeGrupo = metadata?.subject || groupId;
        } catch (err) {
          nomeGrupo = groupId;
        }

        mensagem += `🏷️ *Nome:* ${nomeGrupo}\n`;
        mensagem += `🆔 *ID do grupo:* ${groupId}\n`;
        mensagem += `🔑 *ID do aluguel:* ${aluguel.id}\n`;
        mensagem += `📅 *Expira em:* ${aluguel.expira}\n`;
        mensagem += `⏳ *Duração:* ${aluguel.duracao || "N/A"}\n`;
        mensagem += "━━━━━━━━━━━━━━━━━━\n\n";
      }

      mensagem += `💡 *Dica:* Use ${prefix}apagar_aluguel <id> para remover um aluguel`;

      await sendReply(mensagem);
    } catch (error) {
      console.error("Erro ao listar aluguéis:", error);
      await sendErrorReply(
        `❌ *Erro ao listar aluguéis!*\n\n` +
        `Ocorreu um erro ao processar o comando.\n\n` +
        `Erro: ${error.message}`
      );
    }
  },
};