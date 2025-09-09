/**
 * Comando para adicionar usuário à lista negra do grupo
 * Usuários na lista negra são banidos automaticamente ao tentar entrar no grupo
 * Apenas administradores podem usar este comando
 * 
 * @author VaL
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
      // Cria o diretório data se não existir
      const dataDir = path.dirname(BLACKLIST_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      // Cria arquivo vazio se não existir
      fs.writeFileSync(BLACKLIST_FILE, JSON.stringify({}));
      return {};
    }
    const data = fs.readFileSync(BLACKLIST_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao carregar lista negra:', error);
    return {};
  }
}

// Função para salvar a lista negra
function saveBlacklist(blacklist) {
  try {
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(blacklist, null, 2));
    return true;
  } catch (error) {
    console.error('Erro ao salvar lista negra:', error);
    return false;
  }
}

module.exports = {
  name: "lista-negra-add",
  description: "Adiciona um usuário à lista negra do grupo",
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
        console.error('Erro ao verificar admin:', error);
        return sendReply('❌ Erro ao verificar permissões. Tente novamente.');
      }

      let targetNumber = null;
      let targetName = 'Usuário';

      // Verifica se está respondendo uma mensagem
      if (webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedJid = webMessage.message.extendedTextMessage.contextInfo.participant;
        if (quotedJid) {
          targetNumber = quotedJid.replace('@s.whatsapp.net', '');
          // Tenta pegar o nome do usuário citado
          targetName = webMessage.message.extendedTextMessage.contextInfo.quotedMessage?.conversation || 'Usuário';
        }
      }
      // Verifica se mencionou alguém
      else if (webMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        const mentioned = webMessage.message.extendedTextMessage.contextInfo.mentionedJid[0];
        targetNumber = mentioned.replace('@s.whatsapp.net', '');
      }
      // Verifica se passou o número como argumento
      else if (args.length > 0) {
        // Remove caracteres não numéricos
        const cleanNumber = args[0].replace(/\D/g, '');
        if (cleanNumber.length >= 10) {
          targetNumber = cleanNumber;
        }
      }

      if (!targetNumber) {
        return sendReply(
          `❌ Você precisa especificar um usuário!\n\n` +
          `💡 *Formas de usar:*\n` +
          `• ${PREFIX}lista-negra-add @usuário\n` +
          `• ${PREFIX}lista-negra-add 5511999999999\n` +
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
      if (blacklist[remoteJid].includes(targetNumber)) {
        return sendReply(`⚠️ O usuário *${targetName}* já está na lista negra deste grupo!`);
      }

      // Adiciona o usuário à lista negra
      blacklist[remoteJid].push(targetNumber);

      // Salva a lista atualizada
      if (saveBlacklist(blacklist)) {
        // Tenta banir o usuário se ele estiver no grupo
        try {
          const participants = await props.getGroupParticipants(remoteJid);
          
          // Verifica o formato dos participantes
          let isUserInGroup = false;
          
          if (participants && participants.length > 0) {
            // Tenta diferentes formatos possíveis
            isUserInGroup = participants.some(participant => {
              // Se participant é uma string
              if (typeof participant === 'string') {
                return participant.replace('@s.whatsapp.net', '') === targetNumber;
              }
              // Se participant é um objeto com propriedade id
              else if (participant && participant.id) {
                return participant.id.replace('@s.whatsapp.net', '') === targetNumber;
              }
              // Se participant é um objeto com propriedade jid
              else if (participant && participant.jid) {
                return participant.jid.replace('@s.whatsapp.net', '') === targetNumber;
              }
              return false;
            });
          }

          if (isUserInGroup) {
            await socket.groupParticipantsUpdate(
              remoteJid,
              [`${targetNumber}@s.whatsapp.net`],
              'remove'
            );
            
            sendReply(
              `✅ *Usuário adicionado à lista negra!*\n\n` +
              `👤 *Usuário:* ${targetName}\n` +
              `📱 *Número:* ${targetNumber}\n` +
              `🚫 *Status:* Banido automaticamente do grupo\n\n` +
              `⚠️ Este usuário será banido automaticamente se tentar entrar novamente.`
            );
          } else {
            sendReply(
              `✅ *Usuário adicionado à lista negra!*\n\n` +
              `👤 *Usuário:* ${targetName}\n` +
              `📱 *Número:* ${targetNumber}\n` +
              `🚫 *Status:* Será banido automaticamente se tentar entrar no grupo`
            );
          }
        } catch (error) {
          console.error('Erro ao banir usuário:', error);
          sendReply(
            `✅ *Usuário adicionado à lista negra!*\n\n` +
            `👤 *Usuário:* ${targetName}\n` +
            `📱 *Número:* ${targetNumber}\n` +
            `⚠️ Será banido automaticamente se tentar entrar no grupo`
          );
        }
      } else {
        sendReply('❌ Erro ao salvar na lista negra. Tente novamente.');
      }

    } catch (error) {
      console.error('Erro no comando lista-negra-add:', error);
      props.sendReply('❌ Ocorreu um erro ao executar o comando. Tente novamente.');
    }
  },
};