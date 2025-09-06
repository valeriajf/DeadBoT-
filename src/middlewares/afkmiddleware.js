/**
 * Middleware AFK - Detecta automaticamente quando usuários voltam
 * Substitua o conteúdo do arquivo: src/middlewares/afkMiddleware.js
 * 
 * @author Val (DeadBoT)
 */
const afkSystem = require('../utils/afkSystem');

/**
 * Middleware que verifica AFK automaticamente
 */
module.exports = async (socket, { messages }) => {
  for (const webMessage of messages) {
    try {
      // Ignora mensagens do próprio bot
      if (webMessage.key.fromMe) continue;
      
      // Só processa mensagens de grupos
      const remoteJid = webMessage.key.remoteJid;
      if (!remoteJid?.includes('@g.us')) continue;
      
      const userJid = webMessage.key.participant || webMessage.key.remoteJid;
      
      // Verifica se o usuário estava AFK e agora mandou mensagem
      if (afkSystem.isAFK(userJid)) {
        const afkData = afkSystem.removeAFK(userJid);
        
        if (afkData) {
          // Pega o nome do usuário
          let userName = "Usuário";
          if (webMessage.pushName && !webMessage.pushName.match(/^\+?\d+$/)) {
            userName = webMessage.pushName;
          }
          
          // Calcula duração do AFK
          const now = new Date();
          const duration = afkSystem.formatDuration(now.getTime() - afkData.startTime);
          
          // Formata data/hora atual
          const timeString = now.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          });
          const dateString = now.toLocaleDateString('pt-BR');
          
          // Mensagem de volta
          const welcomeMessage = `👋 @${userJid.split('@')[0]} voltou!

🕐 ${timeString} | 📅 ${dateString}
⏱️ Ficou ausente por: ${duration}
💭 Motivo anterior: ${afkData.reason}`;

          // Envia mensagem mencionando o usuário
          await socket.sendMessage(remoteJid, {
            text: welcomeMessage,
            mentions: [userJid]
          });
        }
      }
      
      // Verifica se alguém mencionou um usuário AFK
      const mentions = webMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      
      for (const mentionedJid of mentions) {
        if (afkSystem.isAFK(mentionedJid) && mentionedJid !== userJid) {
          const afkData = afkSystem.getAFKData(mentionedJid);
          const duration = afkSystem.getAFKDuration(mentionedJid);
          
          // Formata data/hora do AFK
          const afkDate = new Date(afkData.timestamp);
          const afkTimeString = afkDate.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          });
          const afkDateString = afkDate.toLocaleDateString('pt-BR');
          
          // Mensagem informando que o usuário está AFK
          const afkNotification = `💤 @${mentionedJid.split('@')[0]} está AFK desde ${afkDateString} às ${afkTimeString}.

⏱️ Ausente há: ${duration}
💭 Motivo: ${afkData.reason}`;

          await socket.sendMessage(remoteJid, {
            text: afkNotification,
            mentions: [mentionedJid]
          }, { quoted: webMessage });
        }
      }
      
    } catch (error) {
      console.error('❌ [AFK] Erro no middleware AFK:', error.message);
    }
  }
};