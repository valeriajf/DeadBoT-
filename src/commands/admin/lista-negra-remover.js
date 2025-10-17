/**
 * Comando para remover usuário da lista negra do grupo
 * Suporta tanto formato antigo (@s.whatsapp.net) quanto novo (@lid)
 * Remove o usuário da lista de banimento automático
 * Apenas administradores podem usar este comando
 * 
 * @author Dev VaL 
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
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
    console.error('[BLACKLIST] Erro ao carregar lista negra:', error);
    return {};
  }
}

// Função para salvar a lista negra
function saveBlacklist(blacklist) {
  try {
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(blacklist, null, 2));
    return true;
  } catch (error) {
    console.error('[BLACKLIST] Erro ao salvar lista negra:', error);
    return false;
  }
}

// Extrai o identificador único do JID (suporta @s.whatsapp.net e @lid)
function extractUserId(jid) {
  if (!jid) return null;
  
  if (jid.includes('@lid')) {
    return jid.split('@')[0];
  }
  
  if (jid.includes('@s.whatsapp.net')) {
    return jid.split('@')[0];
  }
  
  return jid;
}

// Formata nome de exibição
function formatDisplayName(userId, customName = null) {
  if (customName && customName !== 'Usuário') {
    return customName;
  }
  
  if (userId.length > 15) {
    return `LID: ${userId.substring(0, 15)}...`;
  }
  
  if (userId.startsWith('55') && userId.length >= 12) {
    return userId.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3');
  }
  
  return `+${userId}`;
}

module.exports = {
  name: "lista-negra-remover",
  description: "Remove um usuário da lista negra do grupo (suporta @lid)",
  commands: ["lista-negra-remover", "lista-negra-remove", "blacklist-remove", "ln-remover", "ln-remove"],
  usage: `${PREFIX}lista-negra-remover @usuário ou ${PREFIX}lista-negra-remover (respondendo uma mensagem)`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async (props) => {
    try {
      const { 
        sendReply, 
        args, 
        remoteJid, 
        userJid, 
        getGroupAdmins, 
        webMessage,
        isGroup 
      } = props;

      // Verifica se é um grupo
      if (!isGroup) {
        return sendReply('❌ Este comando só pode ser usado em grupos!');
      }

      // Verifica se o usuário é admin
      try {
        const admins = await getGroupAdmins(remoteJid);
        const isAdmin = admins.includes(userJid);
        
        if (!isAdmin) {
          return sendReply('❌ Apenas administradores podem usar este comando!');
        }
      } catch (error) {
        console.error('[BLACKLIST] Erro ao verificar admin:', error);
        return sendReply('❌ Erro ao verificar permissões. Tente novamente.');
      }

      let targetJid = null;
      let targetUserId = null;
      let targetName = 'Usuário';

      // Verifica se está respondendo uma mensagem
      if (webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        targetJid = webMessage.message.extendedTextMessage.contextInfo.participant;
        if (targetJid) {
          targetUserId = extractUserId(targetJid);
          
          const quotedMsg = webMessage.message.extendedTextMessage.contextInfo.quotedMessage;
          
          if (quotedMsg.conversation && quotedMsg.conversation.length <= 30 && !quotedMsg.conversation.includes('http')) {
            targetName = quotedMsg.conversation.trim();
          } else if (quotedMsg.extendedTextMessage?.text) {
            const text = quotedMsg.extendedTextMessage.text;
            if (text.length <= 30 && !text.includes('http')) {
              targetName = text.trim();
            }
          }
          
          if (targetName === 'Usuário' && webMessage.pushName) {
            targetName = webMessage.pushName;
          }
        }
      }
      // Verifica se mencionou alguém
      else if (webMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        targetJid = webMessage.message.extendedTextMessage.contextInfo.mentionedJid[0];
        targetUserId = extractUserId(targetJid);
        
        const messageText = webMessage.message.extendedTextMessage?.text || '';
        const cleanText = messageText.replace(/#[\w-]+/g, '').replace(/@[\d@lid]+/g, '').trim();
        if (cleanText && cleanText.length > 0 && cleanText.length <= 30) {
          targetName = cleanText;
        }
      }
      // Verifica se passou ID/número como argumento
      else if (args.length > 0 || props.fullArgs) {
        let argsText = props.fullArgs || args.join(' ');
        argsText = argsText.replace(/^#?[\w-]+\s*/, '').trim();
        
        const cleanText = argsText.replace(/@/g, '').trim();
        const argParts = cleanText.split(/\s+/).filter(part => part.length > 0);
        
        if (argParts.length >= 1) {
          const potentialId = argParts[0];
          
          if (/^\d+$/.test(potentialId) && potentialId.length >= 10) {
            targetUserId = potentialId;
          } else if (potentialId.includes('lid') || potentialId.length > 15) {
            targetUserId = potentialId.replace('@lid', '');
          }
          
          if (argParts.length >= 2) {
            targetName = argParts.slice(1).join(' ');
          }
        }
      }

      if (!targetUserId) {
        return sendReply(
          `❌ Você precisa especificar um usuário!\n\n` +
          `💡 *Formas de usar:*\n` +
          `• ${PREFIX}lista-negra-remover @usuário\n` +
          `• ${PREFIX}lista-negra-remover 5511999999999\n` +
          `• ${PREFIX}lista-negra-remover LID@lid\n` +
          `• Responda uma mensagem com ${PREFIX}lista-negra-remover`
        );
      }

      // Carrega a lista negra atual
      const blacklist = loadBlacklist();

      // Verifica se o grupo existe na lista
      if (!blacklist[remoteJid] || blacklist[remoteJid].length === 0) {
        return sendReply('⚠️ A lista negra deste grupo está vazia!');
      }

      // Verifica se o usuário está na lista negra
      const userIndex = blacklist[remoteJid].indexOf(targetUserId);
      if (userIndex === -1) {
        return sendReply(`⚠️ O usuário não está na lista negra deste grupo!`);
      }

      // Remove o usuário da lista negra
      blacklist[remoteJid].splice(userIndex, 1);

      // Se a lista do grupo ficou vazia, remove o grupo do objeto
      if (blacklist[remoteJid].length === 0) {
        delete blacklist[remoteJid];
      }

      // Salva a lista atualizada
      if (saveBlacklist(blacklist)) {
        sendReply(
          `✅ *Usuário removido da lista negra!*\n\n` +
          `👤 *Usuário:* ${formatDisplayName(targetUserId, targetName)}\n` +
          `🆔 *ID:* ${targetUserId}\n` +
          `🟢 *Status:* Pode entrar no grupo novamente\n\n` +
          `💡 O usuário não será mais banido automaticamente.`
        );
      } else {
        sendReply('❌ Erro ao remover da lista negra. Tente novamente.');
      }

    } catch (error) {
      console.error('[BLACKLIST] Erro no comando lista-negra-remover:', error);
      props.sendReply('❌ Ocorreu um erro ao executar o comando. Tente novamente.');
    }
  },
};