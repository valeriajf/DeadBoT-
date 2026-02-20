/**
 * Sistema de verificação automática de aluguéis expirados
 * Verifica a cada 1 minuto
 * @author Adaptado para DeadBoT
 */
const path = require("node:path");
const { verificarExpirados, removerAluguelExpirado } = require(path.join(__dirname, "aluguel"));
const { deactivateGroup } = require(path.join(__dirname, "database"));

let intervaloVerificacao = null;

function iniciarVerificador(socket) {
  if (intervaloVerificacao) return;

  intervaloVerificacao = setInterval(async () => {
    try {
      const expirados = verificarExpirados();

      for (const aluguel of expirados) {
        try {
          // 1. Desativa o grupo
          deactivateGroup(aluguel.groupId);

          // 2. Envia mensagem
          await socket.sendMessage(aluguel.groupId, {
            text:
              `⏰ *Aluguel Expirado!*\n\n` +
              `O período de aluguel deste grupo chegou ao fim.\n\n` +
              `🔑 *ID do aluguel:* ${aluguel.id}\n` +
              `📅 *Expirou em:* ${aluguel.expira}\n\n` +
              `🤖 O bot foi desativado neste grupo.\n\n` +
              `Para renovar o aluguel e reativar o bot, entre em contato com o dono do bot.\n\n` +
              `💤 Entrando em modo OFF...`
          });

          // 3. Remove do banco
          removerAluguelExpirado(aluguel.groupId);

        } catch (error) {
          try { removerAluguelExpirado(aluguel.groupId); } catch (_) {}
        }
      }
    } catch (_) {}
  }, 60000); // 1 minuto
}

function pararVerificador() {
  if (intervaloVerificacao) {
    clearInterval(intervaloVerificacao);
    intervaloVerificacao = null;
  }
}

module.exports = { iniciarVerificador, pararVerificador };
