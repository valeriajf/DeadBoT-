/**
 * Serviço de Monitoramento de Aluguéis
 * Verifica periodicamente aluguéis expirados e desativa os grupos automaticamente
 * 
 * @author Adaptado para DeadBoT
 */
const { verificarExpirados } = require(`${BASE_DIR}/utils/aluguel`);
const { deactivateGroup } = require(`${BASE_DIR}/utils/database`);

/**
 * Intervalo de verificação em milissegundos (1 minuto)
 * Ajuste conforme necessário
 */
const INTERVALO_VERIFICACAO = 1 * 60 * 1000; // 1 minuto

/**
 * Referência ao intervalo para poder limpar depois
 */
let intervaloVerificacao = null;

/**
 * Inicia o monitoramento automático de aluguéis expirados
 * @param {Object} socket - Instância do socket do WhatsApp
 */
function iniciarMonitoramento(socket) {
  console.log("🔄 [Aluguéis] Iniciando monitoramento automático...");
  
  // Limpa qualquer intervalo anterior
  if (intervaloVerificacao) {
    clearInterval(intervaloVerificacao);
  }

  // Executa a primeira verificação imediatamente
  verificarEDesativar(socket);

  // Configura verificação periódica
  intervaloVerificacao = setInterval(() => {
    verificarEDesativar(socket);
  }, INTERVALO_VERIFICACAO);

  console.log(`✅ [Aluguéis] Monitoramento ativo! Verificando a cada ${INTERVALO_VERIFICACAO / 60000} minuto(s)`);
}

/**
 * Verifica aluguéis expirados e desativa os grupos
 * @param {Object} socket - Instância do socket do WhatsApp
 */
async function verificarEDesativar(socket) {
  try {
    const expirados = verificarExpirados();

    if (expirados.length > 0) {
      console.log(`⚠️ [Aluguéis] Encontrados ${expirados.length} aluguel(is) expirado(s)`);

      for (const aluguel of expirados) {
        const { groupId, nomeGrupo, id, expira } = aluguel;

        // Desativa o bot no grupo
        deactivateGroup(groupId);

        console.log(`❌ [Aluguéis] Expirado - Grupo: ${nomeGrupo} (${groupId}) - ID: ${id}`);

        // Tenta enviar mensagem de notificação ao grupo
        try {
          const mensagem = 
            `⏰ *Aluguel Expirado!*\n\n` +
            `O período de aluguel deste grupo chegou ao fim.\n\n` +
            `🔑 *ID do aluguel:* ${id}\n` +
            `📅 *Expirou em:* ${expira}\n\n` +
            `🤖 O bot foi desativado neste grupo.\n\n` +
            `Para renovar o aluguel e reativar o bot, entre em contato com o dono do bot.\n\n` +
            `💤 Entrando em modo OFF...`;

          await socket.sendMessage(groupId, { text: mensagem });
          console.log(`✅ [Aluguéis] Notificação enviada ao grupo ${nomeGrupo}`);
        } catch (error) {
          console.error(`❌ [Aluguéis] Erro ao notificar grupo ${nomeGrupo}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error("❌ [Aluguéis] Erro ao verificar expirados:", error);
  }
}

/**
 * Para o monitoramento de aluguéis
 */
function pararMonitoramento() {
  if (intervaloVerificacao) {
    clearInterval(intervaloVerificacao);
    intervaloVerificacao = null;
    console.log("🛑 [Aluguéis] Monitoramento parado");
  }
}

module.exports = {
  iniciarMonitoramento,
  pararMonitoramento,
};
