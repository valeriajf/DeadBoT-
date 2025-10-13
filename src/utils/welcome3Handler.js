const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração do welcome3
const WELCOME3_DB_PATH = path.join(__dirname, '..', 'database', 'welcome3.json');

function loadWelcome3Data() {
  try {
    if (fs.existsSync(WELCOME3_DB_PATH)) {
      const data = fs.readFileSync(WELCOME3_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Erro ao carregar welcome3.json:', error);
    return {};
  }
}

function saveWelcome3Data(data) {
  try {
    const dbDir = path.dirname(WELCOME3_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(WELCOME3_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar welcome3.json:', error);
  }
}

function getWelcome3Config(groupId) {
  const data = loadWelcome3Data();
  return data[groupId] || null;
}

function isActiveWelcome3Group(groupId) {
  const data = loadWelcome3Data();
  return data[groupId] && data[groupId].active === true;
}

function getCustomWelcome3Message(groupId) {
  const data = loadWelcome3Data();
  return data[groupId] && data[groupId].customMessage ? 
    data[groupId].customMessage : 
    'Bem-vindo ao {grupo}! Olá {membro}, seja bem-vindo(a)! 🎉';
}

/**
 * Handler para processar novos membros no grupo (com foto do grupo)
 * @param {Object} params
 * @param {string} params.groupId - ID do grupo
 * @param {string} params.groupName - Nome do grupo
 * @param {string} params.newMemberId - ID do novo membro
 * @param {string} params.newMemberNumber - Número do novo membro
 * @param {Function} params.sendImageWithCaption - Função para enviar imagem com legenda
 * @param {Function} params.sendTextWithMention - Função para enviar apenas texto com menção
 * @param {Function} params.getGroupPicture - Função para obter foto do grupo
 */
/**
 * Handler para processar novos membros no grupo (com foto do grupo)
 * @param {Object} params
 * @param {string} params.groupId - ID do grupo
 * @param {string} params.groupName - Nome do grupo
 * @param {string} params.newMemberId - ID do novo membro
 * @param {string} params.newMemberNumber - Número do novo membro
 * @param {string} params.pushname - Nome do novo membro
 * @param {Function} params.sendImageWithCaption - Função para enviar imagem com legenda
 * @param {Function} params.sendTextWithMention - Função para enviar apenas texto com menção
 * @param {Function} params.getGroupPicture - Função para obter foto do grupo
 */
async function handleWelcome3NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  pushname,
  sendImageWithCaption,
  sendTextWithMention,
  getGroupPicture
}) {
  try {
    // Verifica se o welcome3 está ativo para este grupo
    if (!isActiveWelcome3Group(groupId)) {
      return;
    }

    console.log(`[WELCOME3] ✅ Ativado - Novo membro: ${pushname || newMemberNumber}`);

    // Obtém a foto do GRUPO (não do membro)
    let groupPicture;
    try {
      groupPicture = await getGroupPicture(groupId);
    } catch (error) {
      groupPicture = null;
    }

    // Obtém a mensagem personalizada
    const customMessage = getCustomWelcome3Message(groupId);
    
    // Substitui as variáveis na mensagem
    // Se não tiver pushname, usa a menção também no lugar de {nome}
    const welcomeMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Este Grupo')
      .replace(/{membro}/g, `@${newMemberNumber}`)
      .replace(/{nome}/g, pushname || `@${newMemberNumber}`);

    // CORREÇÃO: Envia imagem em cima e legenda embaixo (igual comando regras)
    if (groupPicture) {
      await sendImageWithCaption({
        image: groupPicture,
        caption: welcomeMessage,
        mentions: [newMemberId]
      });
      console.log(`[WELCOME3] ✅ Enviado com foto do grupo`);
    } else {
      await sendTextWithMention({
        caption: welcomeMessage,
        mentions: [newMemberId]
      });
      console.log(`[WELCOME3] ✅ Enviado sem foto (texto)`);
    }

  } catch (error) {
    console.error('[WELCOME3] ❌ Erro:', error.message);
  }
}

module.exports = {
  handleWelcome3NewMember,
  isActiveWelcome3Group,
  getCustomWelcome3Message,
  getWelcome3Config,
  loadWelcome3Data,
  saveWelcome3Data
};