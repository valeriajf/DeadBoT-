/**
 * Comando para adicionar usuário à lista negra do grupo
 * Suporta tanto formato antigo (@s.whatsapp.net) quanto novo (@lid)
 * Usuários na lista negra são banidos automaticamente ao tentar entrar no grupo
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
      const dataDir = path.dirname(BLACKLIST_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(BLACKLIST_FILE, JSON.stringify({}));
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
  
  // Se é LID (novo formato)
  if (jid.includes('@lid')) {
    return jid.split('@')[0];
  }
  
  // Se é formato antigo
  if (jid.includes('@s.whatsapp.net')) {
    return jid.split('@')[0];
  }
  
  // Se já é só o número/ID
  return jid;
}

// Formata nome de exibição
function formatDisplayName(userId, customName = null) {
  if (customName && customName !== 'Usuário') {
    return customName;
  }
  
  // Se é LID, usa o ID
  if (userId.length > 15) {
    return `LID: ${userId.substring(0, 15)}...`;
  }
  
  // Se é número de telefone brasileiro
  if (userId.startsWith('55') && userId.length >= 12) {
    return userId.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3');
  }
  
  return `+${userId}`;
}

module.exports = {
  name: "lista-negra-add",
  description: "Adiciona um usuário à lista negra do grupo (suporta @lid)",
  commands: ["lista-negra-add", "blacklist-add", "ln-add"],
  usage: `${PREFIX}lista-negra-add @usuário ou ${PREFIX}lista-negra-add (respondendo uma mensagem)`,
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
        socket, 
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
          
          // Tenta extrair nome da mensagem citada
          const quotedMsg = webMessage.message.extendedTextMessage.contextInfo.quotedMessage;
          
          if (quotedMsg.conversation) {
            if (quotedMsg.conversation.length <= 30 && !quotedMsg.conversation.includes('http')) {
              targetName = quotedMsg.conversation.trim();
            }
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
          // Pode ser número ou LID
          const potentialId = argParts[0];
          
          // Se contém apenas dígitos, é número de telefone
          if (/^\d+$/.test(potentialId) && potentialId.length >= 10) {
            targetUserId = potentialId;
          }
          // Se tem formato de LID
          else if (potentialId.includes('lid') || potentialId.length > 15) {
            targetUserId = potentialId.replace('@lid', '');
          }
          
          // Se tem mais partes, usa como nome
          if (argParts.length >= 2) {
            targetName = argParts.slice(1).join(' ');
          }
        }
      }

      if (!targetUserId) {
        return sendReply(
          `❌ Você precisa especificar um usuário!\n\n` +
          `💡 *Formas de usar:*\n` +
          `• ${PREFIX}lista-negra-add @usuário\n` +
          `• ${PREFIX}lista-negra-add 5511999999999 João\n` +
          `• ${PREFIX}lista-negra-add LID@lid\n` +
          `• Responda uma mensagem com ${PREFIX}lista-negra-add`
        );
      }

      // Carrega a lista negra atual
      const blacklist = loadBlacklist();

      // Verifica se o grupo já existe na lista
      if (!blacklist[remoteJid]) {
        blacklist[remoteJid] = [];
      }

      // Verifica se o usuário já está na lista negra
      if (blacklist[remoteJid].includes(targetUserId)) {
        return sendReply(`⚠️ O usuário já está na lista negra deste grupo!`);
      }

      // Adiciona o usuário à lista negra
      blacklist[remoteJid].push(targetUserId);

      // Salva a lista atualizada
      if (saveBlacklist(blacklist)) {
        // Tenta banir o usuário se ele estiver no grupo
        try {
          const participants = await props.getGroupParticipants(remoteJid);
          
          // Procura o usuário nos participantes (pode ser por número ou LID)
          let userToRemove = null;
          
          for (const participant of participants) {
            const participantId = extractUserId(participant.id);
            if (participantId === targetUserId) {
              userToRemove = participant.id;
              break;
            }
          }

          if (userToRemove) {
            await socket.groupParticipantsUpdate(remoteJid, [userToRemove], 'remove');
            
            sendReply(
              `✅ *Usuário adicionado à lista negra!*\n\n` +
              `👤 *Usuário:* ${formatDisplayName(targetUserId, targetName)}\n` +
              `🆔 *ID:* ${targetUserId}\n` +
              `🚫 *Status:* Banido automaticamente do grupo\n\n` +
              `⚠️ Este usuário será banido automaticamente se tentar entrar novamente.`
            );
          } else {
            sendReply(
              `✅ *Usuário adicionado à lista negra!*\n\n` +
              `👤 *Usuário:* ${formatDisplayName(targetUserId, targetName)}\n` +
              `🆔 *ID:* ${targetUserId}\n` +
              `🚫 *Status:* Será banido automaticamente se tentar entrar no grupo`
            );
          }
        } catch (error) {
          console.error('[BLACKLIST] Erro ao banir usuário:', error);
          sendReply(
            `✅ *Usuário adicionado à lista negra!*\n\n` +
            `👤 *Usuário:* ${formatDisplayName(targetUserId, targetName)}\n` +
            `🆔 *ID:* ${targetUserId}\n` +
            `⚠️ Será banido automaticamente se tentar entrar no grupo`
          );
        }
      } else {
        sendReply('❌ Erro ao salvar na lista negra. Tente novamente.');
      }

    } catch (error) {
      console.error('[BLACKLIST] Erro no comando lista-negra-add:', error);
      props.sendReply('❌ Ocorreu um erro ao executar o comando. Tente novamente.');
    }
  },
};