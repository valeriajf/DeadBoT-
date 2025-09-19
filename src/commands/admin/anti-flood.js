/**
 * Comando anti-flood para DeadBoT
 * Detecta flood real (figurinhas em sequência rápida)
 * Protege administradores
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
      users: new Map() // Armazena { userId: { count: number, lastStickerTime: timestamp, timestamps: [] } }
    });
  }
}

// Função para verificar se usuário é admin
async function isUserAdmin(socket, groupId, userId) {
  try {
    const groupMetadata = await socket.groupMetadata(groupId);
    const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
    return groupAdmins.includes(userId);
  } catch (error) {
    console.log('[ANTI-FLOOD] Erro ao verificar admin:', error);
    return false;
  }
}

// Função para detectar flood (figurinhas em sequência)
function isFlooding(userData) {
  const now = Date.now();
  const floodWindow = 30 * 1000; // 30 segundos para detectar flood
  const maxStickerInterval = 3 * 1000; // 3 segundos entre figurinhas para considerar sequência
  
  // Se passou muito tempo desde a última figurinha, não é flood
  if (now - userData.lastStickerTime > maxStickerInterval) {
    // Reset contador se não há sequência
    userData.count = 1;
    userData.timestamps = [now];
    userData.lastStickerTime = now;
    return false;
  }
  
  // Adiciona timestamp atual
  userData.timestamps.push(now);
  userData.lastStickerTime = now;
  
  // Remove timestamps antigos (fora da janela de flood)
  userData.timestamps = userData.timestamps.filter(timestamp => now - timestamp <= floodWindow);
  
  // Atualiza contador
  userData.count = userData.timestamps.length;
  
  return userData.count >= 10; // Considera flood se 10+ figurinhas em sequência rápida
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
      
      // Verifica se é admin (admins são imunes ao anti-flood)
      const isAdmin = await isUserAdmin(socket, groupId, userId);
      if (isAdmin) {
        return resolve();
      }
      
      // Inicializa dados do usuário se não existir
      if (!groupData.users.has(userId)) {
        groupData.users.set(userId, { 
          count: 0, 
          lastStickerTime: 0,
          timestamps: []
        });
      }
      
      const userData = groupData.users.get(userId);
      
      // Verifica se está fazendo flood
      if (isFlooding(userData)) {
        // Aplicar punições baseado no contador
        switch (userData.count) {
          case 10:
            await socket.sendMessage(groupId, { 
              text: "⚠️ Flood de figurinhas detectado!\n\n🚫 Pare de enviar figurinhas rapidamente ou será punido." 
            });
            break;
            
          case 11:
            await socket.sendMessage(groupId, { 
              text: "🚨 Anti-flood ativado!\n\n⚠️ Primeira advertência - pare o flood de figurinhas!" 
            });
            break;
            
          case 12:
            await socket.sendMessage(groupId, { 
              text: "⛔ Anti-flood: você será banido!\n\n🚫 Última advertência - pare o flood!" 
            });
            break;
            
          case 13:
            try {
              await socket.groupParticipantsUpdate(groupId, [userId], 'remove');
              await socket.sendMessage(groupId, { 
                text: "🔨 Usuário banido por flood de figurinhas (anti-flood)" 
              });
              // Remove usuário dos dados
              groupData.users.delete(userId);
            } catch (error) {
              console.log('[ANTI-FLOOD] Erro ao banir usuário:', error);
              await socket.sendMessage(groupId, { 
                text: "❌ Erro ao banir usuário. Verifique as permissões do bot." 
              });
            }
            break;
        }
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
      
      let activeUsers = 0;
      const now = Date.now();
      
      groupData.users.forEach(userData => {
        if (userData.timestamps.length > 0 && (now - userData.lastStickerTime) < 30000) {
          activeUsers++;
        }
      });
      
      await sendText(
        `📊 *Anti-flood: ${status}*\n\n` +
        `⚠️ *Sistema de punições:*\n` +
        `• 10 figurinhas: Aviso\n` +
        `• 11 figurinhas: 1ª advertência\n` +
        `• 12 figurinhas: 2ª advertência\n` +
        `• 13 figurinhas: Ban automático`
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
          "🔍 O sistema detectará flood real:\n" +
          "• Figurinhas enviadas com menos de 3s de intervalo\n" +
          "• Administradores são imunes\n" +
          "• Punições aplicadas apenas para flood verdadeiro"
        );
        break;
        
      case '0':
      case 'off':
      case 'desativar':
        groupData.active = false;
        await sendText("❌ *Anti-flood desativado!*\n\nO sistema não monitorará mais flood de figurinhas.");
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