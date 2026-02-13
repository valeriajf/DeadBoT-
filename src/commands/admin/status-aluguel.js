/**
 * Comando para verificar status do aluguel do grupo
 * Mostra informações detalhadas sobre o aluguel do grupo atual
 * APENAS ADMINISTRADORES podem usar este comando
 * FUNCIONA MESMO COM ALUGUEL EXPIRADO (para mostrar status)
 * 
 * @author Adaptado para DeadBoT
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const { obterAluguelDoGrupo, calcularTempoRestante } = require(`${BASE_DIR}/utils/aluguel`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "status-aluguel",
  description: "Mostra o status do aluguel do grupo atual (apenas ADM)",
  commands: ["status_aluguel", "status", "aluguel"],
  usage: `${PREFIX}status_aluguel`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    sendReply,
    sendErrorReply,
    remoteJid,
    socket
  }) => {
    try {
      // Verifica se é um grupo
      if (!remoteJid.endsWith("@g.us")) {
        throw new InvalidParameterError(
          "Este comando só funciona em grupos!"
        );
      }

      const aluguel = obterAluguelDoGrupo(remoteJid);
      
      // Se não tem aluguel, mostra status desativado
      if (!aluguel) {
        // Busca o nome do grupo
        let nomeGrupo = "Grupo sem nome";
        try {
          const metadata = await socket.groupMetadata(remoteJid);
          nomeGrupo = metadata?.subject || metadata?.name || "Grupo sem nome";
        } catch (err) {
          console.log("⚠️ Não foi possível obter o nome do grupo");
        }

        await sendReply(
          `📊 *STATUS DO ALUGUEL*\n\n` +
          `*🪀 NOME:* ${nomeGrupo}\n` +
          `*🆔 GRUPO:* ${remoteJid}\n` +
          `💢 *STATUS:* 🔴 DESATIVADO\n\n` +
          `🚨 *Entre em contato com o dono do bot*`
        );
        return;
      }

      // Verifica se o aluguel está expirado
      const agora = Date.now();
      const expirado = aluguel.expiraTimestamp <= agora;

      // ⭐ Se o aluguel expirou, mostra mensagem especial
      if (expirado) {
        await sendReply(
          `🪀 *NOME:* ${aluguel.nomeGrupo}\n` +
          `*🆔 GRUPO:* ${remoteJid}\n` +
          `📅 *VENCIMENTO:* ${aluguel.expira}\n` +
          `💢 *STATUS:* 🔴 DESATIVADO\n\n` +
          `🚨 *Vamos renovar seu contrato?*`
        );
        return;
      }

      // Se tem aluguel ATIVO, mostra informações completas
      const tempoRestante = calcularTempoRestante(aluguel.expiraTimestamp);

      await sendReply(
        `📊 *STATUS DO ALUGUEL*\n\n` +
        `*🪀 NOME:* ${aluguel.nomeGrupo}\n` +
        `*🆔 GRUPO:* ${remoteJid}\n` +
        `⏱️ *TEMPO CONTRATADO:* ${aluguel.duracao}\n` +
        `⌛ *TEMPO RESTANTE:* ${tempoRestante}\n` +
        `📅 *VENCIMENTO:* ${aluguel.expira}\n` +
        `💢 *STATUS:* 🟢 ATIVADO`
      );
    } catch (error) {
      console.log(error);
      await sendErrorReply(
        `Ocorreu um erro ao verificar status: ${error.message}`
      );
    }
  },
};
