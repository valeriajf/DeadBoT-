/**
Este script é responsável
por carregar os eventos
que serão escutados pelo
socket do WhatsApp.

@author Dev Gui
*/
const { TIMEOUT_IN_MILLISECONDS_BY_EVENT } = require("./config");
const { onMessagesUpsert } = require("./middlewares/onMesssagesUpsert");
const { onGroupParticipantsUpdate } = require("./middlewares/onGroupParticipantsUpdate");
const { initX9Monitoring } = require("./middlewares/x9Monitoring");
const path = require("node:path");

exports.load = (socket) => {
  global.BASE_DIR = path.resolve(__dirname);

  // IMPORTANTE: só importar depois do BASE_DIR existir
  const { iniciarVerificador } = require(`${BASE_DIR}/utils/verificador-aluguel`);
  
  const safeEventHandler = async (callback, data, eventName) => {
    try {
      await callback(data);
    } catch (error) {
      // Tratamento básico de erro sem logs
    }
  };

  // ⭐ Inicia o verificador de aluguéis (1 vez apenas)
  iniciarVerificador(socket);

  // ⭐ Inicia o sistema X9 de monitoramento (1 vez apenas)
  initX9Monitoring(socket);

  // ⭐ Inicia o sistema de agendamentos automáticos (grupo-abrir e grupo-fechar)
  setTimeout(() => {
    try {
      const { autoInitSchedules } = require(`${BASE_DIR}/utils/scheduleAutoInit`);
      autoInitSchedules(socket);
    } catch (error) {
      console.error('Erro ao inicializar agendamentos:', error.message);
    }
  }, 3000);

  // 🎂 Inicia o sistema de aniversários automáticos (parabéns às 7h)
  setTimeout(() => {
    try {
      const { startNiverScheduler } = require(`${BASE_DIR}/services/niverScheduler`);
      startNiverScheduler(socket);
    } catch (error) {
      console.error('Erro ao inicializar sistema de aniversários:', error.message);
    }
  }, 5000);

  // 💌 Inicia o sistema de mensagem diária automática (06:00h Brasília)
  // startMensagemDiariaScheduler: inicia o scheduler na primeira vez
  // updateMensagemDiariaSocket: atualiza o socket após reconexões (evita Connection Closed)
  setTimeout(() => {
    try {
      const { startMensagemDiariaScheduler, updateMensagemDiariaSocket } = require(`${BASE_DIR}/services/mensagemDiariaScheduler`);
      if (startMensagemDiariaScheduler) startMensagemDiariaScheduler(socket);
      if (updateMensagemDiariaSocket) updateMensagemDiariaSocket(socket);
    } catch (error) {
      console.error('Erro ao inicializar mensagem diária:', error.message);
    }
  }, 6000);

  // 🛡️ Inicia o sistema de auto-backup (00:00 | 06:00 | 12:00 | 18:00)
  setTimeout(() => {
    try {
      const { startAutoBackup } = require(`${BASE_DIR}/services/autoBackup`);
      const { OWNER_NUMBER } = require(`${BASE_DIR}/config`);
      startAutoBackup(socket, OWNER_NUMBER);
    } catch (error) {
      console.error('Erro ao inicializar auto-backup:', error.message);
    }
  }, 7000);

  // ⭐ Limpeza automática de confirmações BANGHOST (1 vez apenas)
  setInterval(() => {
    try {
      const banghostCommand = require(`${BASE_DIR}/commands/admin/banghost`);
      const pendingBans = banghostCommand.getPendingBans ? banghostCommand.getPendingBans() : new Map();
      
      const now = Date.now();
      let expiredCount = 0;
      
      for (const [id, data] of pendingBans.entries()) {
        if (now - data.timestamp > 60000) {
          pendingBans.delete(id);
          expiredCount++;
          
          if (data.chatId) {
            socket.sendMessage(data.chatId, {
              text: '⏰ Tempo esgotado! Banimento cancelado automaticamente.'
            }).catch(() => {});
          }
        }
      }
      
      if (expiredCount > 0) {
        console.log(`🔄 [BANGHOST] ${expiredCount} confirmações expiradas removidas`);
      }
    } catch (error) {
      console.error('❌ [BANGHOST] Erro na limpeza:', error.message);
    }
  }, 30000);

  // Evento de mensagens
  socket.ev.on("messages.upsert", async (data) => {
    const startProcess = Date.now();
    setTimeout(() => {
      safeEventHandler(
        () =>
          onMessagesUpsert({
            socket,
            messages: data.messages,
            startProcess,
          }),
        data,
        "messages.upsert"
      );
    }, TIMEOUT_IN_MILLISECONDS_BY_EVENT);
  });

  // Evento de participantes do grupo
  socket.ev.on("group-participants.update", async (update) => {
    setTimeout(() => {
      safeEventHandler(
        () =>
          onGroupParticipantsUpdate({
            socket,
            userJid: update.participants[0],
            remoteJid: update.id,
            action: update.action,
            webMessage: update,
          }),
        update,
        "group-participants.update"
      );
    }, TIMEOUT_IN_MILLISECONDS_BY_EVENT);
  });
};
