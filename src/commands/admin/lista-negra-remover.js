/**
 * Comando para remover usuário da lista negra do grupo
 * Remove o usuário da lista de banimento automático
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
  name: "lista-negra-remover",
  description: "Remove um usuário da lista negra do grupo",
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
          `• ${PREFIX}lista-negra-remover @usuário\n` +
          `• ${PREFIX}lista-negra-remover 5511999999999\n` +
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
      const userIndex = blacklist[remoteJid].indexOf(targetNumber);
      if (userIndex === -1) {
        return sendReply(`⚠️ O usuário *${targetName}* não está na lista negra deste grupo!`);
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
          `👤 *Usuário:* ${targetName}\n` +
          `📱 *Número:* ${targetNumber}\n` +
          `🟢 *Status:* Pode entrar no grupo novamente\n\n` +
          `💡 O usuário não será mais banido automaticamente.`
        );
      } else {
        sendReply('❌ Erro ao remover da lista negra. Tente novamente.');
      }

    } catch (error) {
      console.error('Erro no comando lista-negra-remover:', error);
      props.sendReply('❌ Ocorreu um erro ao executar o comando. Tente novamente.');
    }
  },
};