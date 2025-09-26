const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração do welcome2
const WELCOME2_DB_PATH = path.join(__dirname, '..', 'database', 'welcome2.json');

function loadWelcome2Data() {
  try {
    if (fs.existsSync(WELCOME2_DB_PATH)) {
      const data = fs.readFileSync(WELCOME2_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Erro ao carregar welcome2.json:', error);
    return {};
  }
}

function saveWelcome2Data(data) {
  try {
    const dbDir = path.dirname(WELCOME2_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(WELCOME2_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar welcome2.json:', error);
  }
}

function getWelcome2Config(groupId) {
  const data = loadWelcome2Data();
  return data[groupId] || null;
}

function isActiveWelcome2Group(groupId) {
  const data = loadWelcome2Data();
  return data[groupId] && data[groupId].active === true;
}

function getCustomWelcomeMessage(groupId) {
  const data = loadWelcome2Data();
  return data[groupId] && data[groupId].customMessage ? 
    data[groupId].customMessage : 
    'Bem-vindo ao {grupo}! Olá {membro}, seja bem-vindo(a)! 🎉';
}

/**
 * Handler para processar novos membros no grupo
 * @param {Object} params
 * @param {string} params.groupId - ID do grupo
 * @param {string} params.groupName - Nome do grupo
 * @param {string} params.newMemberId - ID do novo membro
 * @param {string} params.newMemberNumber - Número do novo membro
 * @param {Function} params.sendImageWithCaption - Função para enviar imagem com legenda
 * @param {Function} params.sendTextWithMention - Função para enviar apenas texto com menção
 * @param {Function} params.getProfilePicture - Função para obter foto de perfil
 */
async function handleWelcome2NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  sendImageWithCaption,
  sendTextWithMention,
  getProfilePicture
}) {
  try {
    // Verifica se o welcome2 está ativo para este grupo
    if (!isActiveWelcome2Group(groupId)) {
      console.log(`[WELCOME2] Desativado para o grupo ${groupId}`);
      return;
    }

    console.log(`[WELCOME2] Processando novo membro ${newMemberNumber} no grupo ${groupId}`);

    // Obtém a foto de perfil do novo membro
    let profilePicture;
    try {
      profilePicture = await getProfilePicture(newMemberId);
      console.log(`[WELCOME2] Foto de perfil obtida: ${profilePicture ? 'Sim' : 'Não'}`);
    } catch (error) {
      console.log('[WELCOME2] Não foi possível obter a foto de perfil:', error.message);
      profilePicture = null;
    }

    // Obtém a mensagem personalizada
    const customMessage = getCustomWelcomeMessage(groupId);
    
    // Substitui as variáveis na mensagem
    const welcomeMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Este Grupo')
      .replace(/{membro}/g, `@${newMemberNumber}`);

    console.log(`[WELCOME2] Mensagem: "${welcomeMessage}"`);
    console.log(`[WELCOME2] Menções: [${newMemberId}]`);

    // CORREÇÃO: Envia a mensagem mesmo sem foto de perfil
    if (profilePicture) {
      // Com foto de perfil
      await sendImageWithCaption({
        image: profilePicture,
        caption: welcomeMessage,
        mentions: [newMemberId]
      });
      console.log(`[WELCOME2] Mensagem com foto enviada para ${newMemberNumber}`);
    } else {
      // Sem foto de perfil - envia apenas o texto com menção
      await sendTextWithMention({
        caption: welcomeMessage,
        mentions: [newMemberId]
      });
      console.log(`[WELCOME2] Mensagem de texto enviada para ${newMemberNumber}`);
    }

  } catch (error) {
    console.error('[WELCOME2] Erro no handler:', error);
  }
}

module.exports = {
  handleWelcome2NewMember,
  isActiveWelcome2Group,
  getCustomWelcomeMessage,
  getWelcome2Config,
  loadWelcome2Data,
  saveWelcome2Data
};