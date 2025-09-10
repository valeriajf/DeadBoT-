/**
 * Event handler para banimento automático de usuários na lista negra
 * Monitora quando usuários entram no grupo e verifica se estão na lista negra
 * 
 * @author VaL
 */
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo da lista negra
const BLACKLIST_FILE = path.join(BASE_DIR, 'data', 'blacklist.json');

// Função para carregar a lista negra
function loadBlacklist() {
  try {
    if (!fs.existsSync(BLACKLIST_FILE)) {
      return {};
    }
    const data = fs.readFileSync(BLACKLIST_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao carregar lista negra:', error);
    return {};
  }
}

/**
 * Função para verificar e banir usuários da lista negra
 * Chame esta função sempre que alguém entrar no grupo
 */
async function checkAndBanBlacklistedUsers(socket, groupId, newParticipants) {
  try {
    // Carrega a lista negra
    const blacklist = loadBlacklist();
    
    // Verifica se o grupo tem lista negra
    if (!blacklist[groupId] || blacklist[groupId].length === 0) {
      return;
    }

    for (const participant of newParticipants) {
      const userNumber = participant.replace('@s.whatsapp.net', '');
      
      // Verifica se o usuário está na lista negra
      if (blacklist[groupId].includes(userNumber)) {
        try {
          console.log(`[BLACKLIST] Detectado usuário ${userNumber} na lista negra do grupo ${groupId}`);
          
          // Bane o usuário imediatamente
          await socket.groupParticipantsUpdate(groupId, [participant], 'remove');
          
          // Envia mensagem informando sobre o banimento automático
          const banMessage = 
            `🚫 *BANIMENTO AUTOMÁTICO*\n\n` +
            `👤 *Usuário:* ${userNumber}\n` +
            `⚠️ *Motivo:* Usuário está na lista negra\n` +
            `🔒 *Ação:* Banido automaticamente\n\n` +
            `💡 Para remover da lista negra, use o comando !lista-negra-remover`;
          
          await socket.sendMessage(groupId, { text: banMessage });
          
          console.log(`[BLACKLIST] Usuário ${userNumber} banido automaticamente do grupo ${groupId}`);
          
        } catch (error) {
          console.error(`[BLACKLIST] Erro ao banir usuário ${userNumber}:`, error);
          
          // Se falhar ao banir, pelo menos avisa os admins
          try {
            const warningMessage = 
              `⚠️ *ALERTA - LISTA NEGRA*\n\n` +
              `👤 *Usuário:* ${userNumber}\n` +
              `🚨 *Status:* Na lista negra mas não foi possível banir automaticamente\n` +
              `💡 *Ação recomendada:* Bana manualmente ou verifique as permissões do bot`;
            
            await socket.sendMessage(groupId, { text: warningMessage });
          } catch (msgError) {
            console.error('[BLACKLIST] Erro ao enviar mensagem de aviso:', msgError);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('[BLACKLIST] Erro no checkAndBanBlacklistedUsers:', error);
  }
}

// Exemplo de como integrar com o event handler do seu bot
// VOCÊ PRECISA ADAPTAR ISSO PARA O SISTEMA DE EVENTOS DO SEU BOT

module.exports = {
  name: "blacklist-auto-ban",
  description: "Bane automaticamente usuários da lista negra que tentam entrar no grupo",
  
  // Esta é uma função exemplo - você precisa adaptá-la para o seu sistema de eventos
  checkAndBanBlacklistedUsers,
};