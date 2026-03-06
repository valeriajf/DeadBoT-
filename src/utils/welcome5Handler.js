const fs = require('fs');
const path = require('path');

const WELCOME5_DB_PATH = path.join(__dirname, '..', 'database', 'welcome5.json');
const WELCOME5_VIDEOS_DIR = path.join(__dirname, '..', '..', 'assets', 'videos');

function loadWelcome5Data() {
  try {
    if (fs.existsSync(WELCOME5_DB_PATH)) return JSON.parse(fs.readFileSync(WELCOME5_DB_PATH, 'utf8'));
    return {};
  } catch { return {}; }
}

function saveWelcome5Data(data) {
  try {
    const dbDir = path.dirname(WELCOME5_DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(WELCOME5_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function isActiveWelcome5Group(groupId) {
  const data = loadWelcome5Data();
  return data[groupId]?.active === true;
}

function getCustomWelcome5Message(groupId) {
  const data = loadWelcome5Data();
  return data[groupId]?.customMessage || 'Bem-vindo ao {grupo}! Olá {nome}, seja bem-vindo(a)! 🎉';
}

function getGifFileName(groupId) {
  const data = loadWelcome5Data();
  return data[groupId]?.gifFileName || null;
}

function updateGroupName(groupId, groupName) {
  const data = loadWelcome5Data();
  if (data[groupId] && groupName) {
    data[groupId].groupName = groupName;
    saveWelcome5Data(data);
  }
}

async function handleWelcome5NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  pushname,
  sendGifFromFile,
  sendTextWithMention,
}) {
  try {
    if (!isActiveWelcome5Group(groupId)) return;

    updateGroupName(groupId, groupName);

    const customMessage = getCustomWelcome5Message(groupId);
    const welcomeMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Este Grupo')
      .replace(/{membro}/g, `@${newMemberNumber}`)
      .replace(/{nome}/g, pushname || 'Novo Membro');

    const gifFileName = getGifFileName(groupId);

    if (!gifFileName) {
      await sendTextWithMention({ caption: welcomeMessage, mentions: [newMemberId] });
      return;
    }

    // ✅ CORRIGIDO: busca na pasta assets/videos/
    const fullPath = path.join(WELCOME5_VIDEOS_DIR, gifFileName);

    if (!fs.existsSync(fullPath)) {
      console.error('[WELCOME5] Arquivo não encontrado:', fullPath);
      await sendTextWithMention({ caption: welcomeMessage, mentions: [newMemberId] });
      return;
    }

    await sendGifFromFile(fullPath, welcomeMessage, [newMemberId]);

  } catch (error) {
    console.error('[WELCOME5] Erro:', error.message);
    try {
      const fallbackMsg = `Bem-vindo ao ${groupName || 'grupo'}! Olá @${newMemberNumber}, seja bem-vindo(a)! 🎉`;
      await sendTextWithMention({ caption: fallbackMsg, mentions: [newMemberId] });
    } catch {}
  }
}

module.exports = {
  handleWelcome5NewMember,
  isActiveWelcome5Group,
  getCustomWelcome5Message,
  getGifFileName,
  loadWelcome5Data,
  saveWelcome5Data,
  updateGroupName,
};
