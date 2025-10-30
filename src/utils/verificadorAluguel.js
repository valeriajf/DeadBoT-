/**
 * Sistema de verificação automática de aluguéis expirados
 * Verifica a cada minuto se há aluguéis vencidos
 * 
 * @author Adaptado para DeadBoT
 */
const { verificarExpirados } = require("./aluguel");
const { deactivateGroup } = require("./database");

let intervaloVerificacao = null;

/**
 * Inicia o verificador de aluguéis expirados
 * @param {Object} socket - Socket do baileys
 */
function iniciarVerificador(socket) {
  // Evita criar múltiplos intervalos
  if (intervaloVerificacao) {
    console.log("⚠️ Verificador de aluguéis já está rodando");
    return;
  }

  console.log("✅ Verificador de aluguéis iniciado");

  // Verifica a cada 1 minuto (60000 ms)
  intervaloVerificacao = setInterval(async () => {
    try {
      const expirados = verificarExpirados();

      if (expirados.length > 0) {
        console.log(`🔔 ${expirados.length} aluguel(is) expirado(s) encontrado(s)`);

        for (const aluguel of expirados) {
          try {
            console.log(`📴 Desativando bot no grupo: ${aluguel.groupId}`);

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

            console.log(`✅ Bot desativado no grupo: ${aluguel.groupId}`);
          } catch (error) {
            console.error(`❌ Erro ao desativar bot no grupo ${aluguel.groupId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("❌ Erro no verificador de aluguéis:", error);
    }
  }, 60000); // 60000 ms = 1 minuto
}

/**
 * Para o verificador de aluguéis
 */
function pararVerificador() {
  if (intervaloVerificacao) {
    clearInterval(intervaloVerificacao);
    intervaloVerificacao = null;
    console.log("🛑 Verificador de aluguéis parado");
  }
}

module.exports = {
  iniciarVerificador,
  pararVerificador,
};