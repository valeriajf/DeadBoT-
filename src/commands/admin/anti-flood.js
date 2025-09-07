/**
 * Comando anti-flood para DeadBoT
 * Limita figurinhas por usuário e aplica punições progressivas
 * 10 figurinhas: aviso
 * 11 figurinhas: 1ª advertência
 * 12 figurinhas: 2ª advertência  
 * 13 figurinhas: ban automático
 *
 * @author Adaptado para DeadBoT
 */
const { PREFIX } = require("../../config");

// Armazena configurações e contadores por grupo (GLOBAL)
global.antifloodData = global.antifloodData || new Map();

// Função para inicializar dados do grupo
function initGroupData(groupId) {
  if (!global.antifloodData.has(groupId)) {
    global.antifloodData.set(groupId, {
      active: false,
      users: new Map()
    });
  }
}

// Função para verificar e resetar contador se passou 30 minutos
function checkAndResetUser(groupId, userId) {
  const groupData = global.antifloodData.get(groupId);
  if (!groupData) return;
  
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
  if (!groupData.users.has(userId)) {
    groupData.users.set(userId, { count: 0, lastReset: now });
    return;
  }
  
  const userData = groupData.users.get(userId);
  
  if (now - userData.lastReset >= thirtyMinutes) {
    userData.count = 0;
    userData.lastReset = now;
  }
}

// Middleware para processar figurinhas
function processSticker({ socket, message, from }) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!message || message.type !== 'sticker') {
        return resolve();
      }
      
      const groupId = from;
      const userId = message.author;
      
      initGroupData(groupId);
      const groupData = global.antifloodData.get(groupId);
      
      if (!groupData.active) {
        return resolve();
      }
      
      checkAndResetUser(groupId, userId);
      
      const userData = groupData.users.get(userId);
      userData.count += 1;
      
      switch (userData.count) {
        case 10:
          await socket.sendMessage(groupId, { 
            text: "⚠️ Limite de 10 figurinhas atingido!\n\n⏰ Aguarde 30 minutos para enviar mais figurinhas." 
          });
          break;
          
        case 11:
          await socket.sendMessage(groupId, { 
            text: "🚨 Anti-flood ativado, máximo de figurinhas atingido!\n\n⚠️ Pare de enviar figurinhas ou será punido!" 
          });
          break;
          
        case 12:
          await socket.sendMessage(groupId, { 
            text: "⛔ Anti-flood ativado: você será banido!\n\n🚫 Última advertência!" 
          });
          break;
          
        case 13:
          try {
            await socket.groupParticipantsUpdate(groupId, [userId], 'remove');
            await socket.sendMessage(groupId, { 
              text: "🔨 Usuário banido por spam de figurinhas" 
            });
          } catch (error) {
            console.log('[ANTI-FLOOD] Erro ao banir usuário:', error);
            await socket.sendMessage(groupId, { 
              text: "❌ Erro ao banir usuário. Verifique as permissões do bot." 
            });
          }
          break;
      }
      
      resolve();
    } catch (error) {
      console.error('[ANTI-FLOOD] Erro no processamento:', error);
      reject(error);
    }
  });
}

module.exports = {
  name: "anti-flood",
  description: "Ativa ou desativa o sistema anti-flood de figurinhas",
  commands: ["anti-flood", "antiflood", "af"],
  usage: `${PREFIX}anti-flood [1/0] - 1 para ativar, 0 para desativar`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ args, webMessage, sendText, from }) => {
    // Usa o ID do grupo do webMessage se from estiver undefined
    const groupId = from || webMessage?.key?.remoteJid;
    
    if (!groupId || !groupId.includes('@g.us')) {
      await sendText("❌ Este comando só funciona em grupos!");
      return;
    }
    
    initGroupData(groupId);
    const groupData = global.antifloodData.get(groupId);
    
    // Se não há argumentos, mostra o status atual
    if (!args[0]) {
      const status = groupData.active ? "🟢 ATIVO" : "🔴 INATIVO";
      const totalUsers = groupData.users.size;
      
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      let activeUsers = 0;
      
      groupData.users.forEach(userData => {
        if (userData.count > 0 && (now - userData.lastReset) < thirtyMinutes) {
          activeUsers++;
        }
      });
      
      await sendText(
        `📊 *Status do Anti-flood*\n\n` +
        `• Status: ${status}\n` +
        `• Usuários no sistema: ${totalUsers}\n` +
        `• Usuários ativos (30min): ${activeUsers}\n` +
        `• Limite: 10 figurinhas a cada 30 minutos\n\n` +
        `💡 *Como usar:*\n` +
        `• ${PREFIX}anti-flood 1 - Ativar\n` +
        `• ${PREFIX}anti-flood 0 - Desativar\n\n` +
        `⚠️ *Sistema de punições (flood):*\n` +
        `• 10 figurinhas: Aviso (aguarde 30min)\n` +
        `• 11 figurinhas: 1ª advertência\n` +
        `• 12 figurinhas: 2ª advertência\n` +
        `• 13 figurinhas: Ban automático\n\n` +
        `⏰ *Contador reseta automaticamente em 30 minutos*`
      );
      return;
    }
    
    const action = args[0].toLowerCase();
    
    switch (action) {
      case '1':
      case 'on':
      case 'ativar':
        groupData.active = true;
        await sendText(
          "✅ *Anti-flood ativado!*\n\n" +
          "🔍 O sistema monitorará figurinhas:\n" +
          "• Máximo: 10 figurinhas a cada 30 minutos\n" +
          "• Punições aplicadas apenas em caso de flood\n" +
          "• Contador reseta automaticamente"
        );
        break;
        
      case '0':
      case 'off':
      case 'desativar':
        groupData.active = false;
        await sendText("❌ *Anti-flood desativado!*\n\nO sistema não monitorará mais as figurinhas.");
        break;
        
      default:
        await sendText(
          `❌ *Opção inválida!*\n\n` +
          `💡 *Como usar:*\n` +
          `• ${PREFIX}anti-flood 1 - Ativar\n` +
          `• ${PREFIX}anti-flood 0 - Desativar`
        );
    }
  },
  
  // Exporta função para uso no middleware principal
  processSticker
};