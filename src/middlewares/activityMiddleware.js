/**
 * Middleware de Rastreamento de Atividade
 * Integra o sistema de rastreamento ao loader principal
 * 
 * Salve este arquivo como: src/middlewares/activityMiddleware.js
 * 
 * @author Val (DeadBoT)
 */
const activityTracker = require('../utils/activityTracker');

/**
 * Middleware que rastreia a atividade dos usuários
 * Deve ser chamado antes do processamento dos comandos
 */
function activityMiddleware(socket) {
  // Intercepta todas as mensagens recebidas
  socket.ev.on('messages.upsert', ({ messages }) => {
    messages.forEach((message) => {
      try {
        // Ignora mensagens do próprio bot
        if (message.key.fromMe) return;

        const remoteJid = message.key.remoteJid;
        const userJid = message.key.participant || message.key.remoteJid;

        // Só processa mensagens de grupos
        if (!remoteJid?.includes('@g.us')) return;

        // Verifica o tipo da mensagem
        const messageType = Object.keys(message.message || {})[0];

        switch (messageType) {
          case 'conversation':
          case 'extendedTextMessage':
            // Mensagem de texto
            activityTracker.trackMessage(remoteJid, userJid);
            break;

          case 'stickerMessage':
            // Figurinha
            activityTracker.trackSticker(remoteJid, userJid);
            break;

          case 'imageMessage':
          case 'videoMessage':
          case 'audioMessage':
          case 'documentMessage':
            // Outras mídias contam como mensagem
            activityTracker.trackMessage(remoteJid, userJid);
            break;

          default:
            // Outros tipos de mensagem
            if (messageType) {
              activityTracker.trackMessage(remoteJid, userJid);
            }
            break;
        }
      } catch (error) {
        console.error('Erro no middleware de atividade:', error);
      }
    });
  });

  // Intercepta quando usuários saem do grupo
  socket.ev.on('group-participants.update', ({ id, participants, action }) => {
    try {
      if (action === 'remove') {
        participants.forEach(participant => {
          activityTracker.removeUser(id, participant);
        });
      }
    } catch (error) {
      console.error('Erro ao processar saída de participante:', error);
    }
  });

  // Intercepta quando o bot é removido de um grupo
  socket.ev.on('groups.update', (updates) => {
    updates.forEach(update => {
      try {
        if (update.participants && update.participants.length === 0) {
          // Bot foi removido do grupo
          activityTracker.removeGroup(update.id);
        }
      } catch (error) {
        console.error('Erro ao processar atualização do grupo:', error);
      }
    });
  });

  return activityTracker;
}

module.exports = { activityMiddleware };