const fs = require('fs');
const path = require('path');

const WELCOME5_DB_PATH = path.join(__dirname, '..', 'database', 'welcome5.json');
const WELCOME5_IMAGES_DIR = path.join(__dirname, '..', '..', 'assets', 'images');

function loadWelcome5Data() {
  try {
    if (fs.existsSync(WELCOME5_DB_PATH)) {
      const data = fs.readFileSync(WELCOME5_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('[WELCOME5] Erro ao carregar database:', error);
    return {};
  }
}

function isActiveWelcome5Group(groupId) {
  const data = loadWelcome5Data();
  return data[groupId] && data[groupId].active === true;
}

function getCustomWelcome5Message(groupId) {
  const data = loadWelcome5Data();
  return data[groupId] && data[groupId].customMessage ? 
    data[groupId].customMessage : 
    'Bem-vindo ao {grupo}! Olá {nome}, seja bem-vindo(a)! 🎉';
}

function getGifFileName(groupId) {
  const data = loadWelcome5Data();
  return data[groupId]?.gifFileName || null;
}

/**
 * Handler para processar novos membros no grupo (com GIF)
 */
async function handleWelcome5NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  pushname,
  sendGifFromFile,
  sendTextWithMention
}) {
  try {
    if (!isActiveWelcome5Group(groupId)) {
      return;
    }

    const gifFileName = getGifFileName(groupId);
    
    if (!gifFileName) {
      const customMessage = getCustomWelcome5Message(groupId);
      const welcomeMessage = customMessage
        .replace(/{grupo}/g, groupName || 'Este Grupo')
        .replace(/{membro}/g, `@${newMemberNumber}`)
        .replace(/{nome}/g, pushname || 'Novo Membro');
      
      await sendTextWithMention({
        caption: welcomeMessage,
        mentions: [newMemberId]
      });
      
      return;
    }

    const fullPath = path.join(WELCOME5_IMAGES_DIR, gifFileName);
    
    if (!fs.existsSync(fullPath)) {
      console.error('[WELCOME5] Arquivo não encontrado:', fullPath);
      throw new Error(`GIF não encontrado: ${gifFileName}`);
    }

    const customMessage = getCustomWelcome5Message(groupId);
    const welcomeMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Este Grupo')
      .replace(/{membro}/g, `@${newMemberNumber}`)
      .replace(/{nome}/g, pushname || 'Novo Membro');

    await sendGifFromFile(fullPath, welcomeMessage, [newMemberId]);

  } catch (error) {
    console.error('[WELCOME5] Erro:', error.message);
    
    try {
      const customMessage = getCustomWelcome5Message(groupId);
      const welcomeMessage = customMessage
        .replace(/{grupo}/g, groupName || 'Este Grupo')
        .replace(/{membro}/g, `@${newMemberNumber}`)
        .replace(/{nome}/g, pushname || 'Novo Membro');
      
      await sendTextWithMention({
        caption: `${welcomeMessage}\n\n⚠️ (Erro ao carregar GIF)`,
        mentions: [newMemberId]
      });
    } catch (fallbackError) {
      console.error('[WELCOME5] Erro no fallback:', fallbackError.message);
    }
  }
}

module.exports = {
  handleWelcome5NewMember,
  isActiveWelcome5Group,
  getCustomWelcome5Message,
  getGifFileName
};