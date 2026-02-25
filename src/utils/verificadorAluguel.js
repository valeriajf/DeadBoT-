/**

Sistema de verificação automática de aluguéis expirados

Verifica a cada minuto se há aluguéis vencidos

@author Adaptado para DeadBoT
*/
const { verificarExpirados } = require("./aluguel");
const { deactivateGroup } = require("./database");


let intervaloVerificacao = null;

/**

Inicia o verificador de aluguéis expirados

@param {Object} socket - Socket do baileys
*/
function iniciarVerificador(socket) {
  // Evita criar múltiplos intervalos
  if (intervaloVerificacao) {
    return;
  }

  // Verifica a cada 1 minuto (60000 ms)
  intervaloVerificacao = setInterval(async () => {
    try {
      const expirados = verificarExpirados();

      if (expirados.length > 0) {
        for (const aluguel of expirados) {
          try {
            // Desativa o bot no grupo
            deactivateGroup(aluguel.groupId);

            // Envia mensagem informando sobre a expiração
            await socket.sendMessage(aluguel.groupId, {
              text: `⏰ *Aluguel Expirado!*\n\n` +
                    `O período de aluguel deste grupo chegou ao fim.\n\n` +
                    `🔑 *ID do aluguel:* ${aluguel.id}\n` +
                    `📅 *Expirou em:* ${aluguel.expira}\n\n` +
                    `🤖 O bot foi desativado neste grupo.\n\n` +
                    `Para renovar o aluguel e reativar o bot, entre em contato com o dono do bot.\n\n` +
                    `💤 Entrando em modo OFF...`
            });

          } catch (error) {
            // Erro silencioso ao desativar grupo específico
          }
        }
      }
    } catch (error) {
      // Erro silencioso no verificador
    }
  }, 60000); // 60000 ms = 1 minuto
}

/**

Para o verificador de aluguéis
*/
function pararVerificador() {
  if (intervaloVerificacao) {
    clearInterval(intervaloVerificacao);
    intervaloVerificacao = null;
  }
}


module.exports = {
  iniciarVerificador,
  pararVerificador,
};
