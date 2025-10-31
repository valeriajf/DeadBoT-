const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração do welcome4
const WELCOME4_DB_PATH = path.join(__dirname, '..', 'database', 'welcome4.json');

function loadWelcome4Data() {
  try {
    if (fs.existsSync(WELCOME4_DB_PATH)) {
      const data = fs.readFileSync(WELCOME4_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Erro ao carregar welcome4.json:', error);
    return {};
  }
}

function saveWelcome4Data(data) {
  try {
    const dbDir = path.dirname(WELCOME4_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(WELCOME4_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar welcome4.json:', error);
  }
}

function getWelcome4Config(groupId) {
  const data = loadWelcome4Data();
  return data[groupId] || null;
}

function isActiveWelcome4Group(groupId) {
  const data = loadWelcome4Data();
  return data[groupId] && data[groupId].active === true;
}

function getCustomWelcome4Message(groupId) {
  const data = loadWelcome4Data();
  return data[groupId] && data[groupId].customMessage ? 
    data[groupId].customMessage : 
    'Bem-vindo ao {grupo}! Olá {nome}, seja bem-vindo(a)! 🎉';
}

/**
 * Handler para processar novos membros no grupo (apenas texto, sem foto)
 * @param {Object} params
 * @param {string} params.groupId - ID do grupo
 * @param {string} params.groupName - Nome do grupo
 * @param {string} params.newMemberId - ID do novo membro
 * @param {string} params.newMemberNumber - Número do novo membro
 * @param {string} params.pushname - Nome do novo membro
 * @param {Function} params.sendTextWithMention - Função para enviar apenas texto com menção
 */
async function handleWelcome4NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  pushname,
  sendTextWithMention
}) {
  try {
    // Verifica se o welcome4 está ativo para este grupo
    if (!isActiveWelcome4Group(groupId)) {
      return;
    }

    console.log(`[WELCOME4] ✅ Ativado - Novo membro: ${pushname || newMemberNumber}`);

    // Obtém a mensagem personalizada
    const customMessage = getCustomWelcome4Message(groupId);
    
    // Substitui as variáveis na mensagem
    const welcomeMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Este Grupo')
      .replace(/{membro}/g, `@${newMemberNumber}`)
      .replace(/{nome}/g, pushname || 'Novo Membro');

    // Envia apenas texto com menção (SEM FOTO)
    await sendTextWithMention({
      caption: welcomeMessage,
      mentions: [newMemberId]
    });
    
    console.log(`[WELCOME4] ✅ Enviado apenas texto`);

  } catch (error) {
    console.error('[WELCOME4] ❌ Erro:', error.message);
  }
}

module.exports = {
  handleWelcome4NewMember,
  isActiveWelcome4Group,
  getCustomWelcome4Message,
  getWelcome4Config,
  loadWelcome4Data,
  saveWelcome4Data
};