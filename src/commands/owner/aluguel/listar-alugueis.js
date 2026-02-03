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

/**
 * Calcula o tempo restante até a expiração
 * @param {number} expiraTimestamp - Timestamp de expiração
 * @returns {string} Texto formatado com o tempo restante
 */
function calcularTempoRestante(expiraTimestamp) {
  const agora = Date.now();
  const diferenca = expiraTimestamp - agora;
  
  if (diferenca <= 0) {
    return "⚠️ *EXPIRADO*";
  }
  
  const segundos = Math.floor(diferenca / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  
  if (dias > 0) {
    const horasRestantes = horas % 24;
    if (horasRestantes > 0) {
      return `⏳ ${dias} dia${dias > 1 ? 's' : ''} e ${horasRestantes}h`;
    }
    return `⏳ ${dias} dia${dias > 1 ? 's' : ''}`;
  } else if (horas > 0) {
    const minutosRestantes = minutos % 60;
    if (minutosRestantes > 0) {
      return `⏳ ${horas}h e ${minutosRestantes}min`;
    }
    return `⏳ ${horas}h`;
  } else if (minutos > 0) {
    return `⏳ ${minutos} minuto${minutos > 1 ? 's' : ''}`;
  } else {
    return `⏳ ${segundos} segundo${segundos > 1 ? 's' : ''}`;
  }
}

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
        const nomeGrupo = aluguel.nomeGrupo || "Grupo sem nome";
        const tempoRestante = calcularTempoRestante(aluguel.expiraTimestamp);

        mensagem += `🏷️ *Nome:* ${nomeGrupo}\n`;
        mensagem += `🆔 *ID do grupo:* ${groupId}\n`;
        mensagem += `🔑 *ID do aluguel:* ${aluguel.id}\n`;
        mensagem += `📅 *Expira em:* ${aluguel.expira}\n`;
        mensagem += `${tempoRestante} restante\n`;
        mensagem += `⌛ *Duração original:* ${aluguel.duracao}\n`;
        mensagem += "━━━━━━━━━━━━━━━━━━\n\n";
      }

      mensagem += `💡 *Dica:* Use ${prefix}apagar_aluguel <id> para remover um aluguel`;

      await sendReply(mensagem);
    } catch (error) {
      console.error("❌ Erro ao listar aluguéis:", error);
      await sendErrorReply(
        `❌ *Erro ao listar aluguéis!*\n\n` +
        `Ocorreu um erro ao processar o comando.\n\n` +
        `Erro: ${error.message}`
      );
    }
  },
};