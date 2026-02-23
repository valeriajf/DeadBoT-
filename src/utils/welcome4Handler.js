const fs = require('fs');
const path = require('path');

const WELCOME4_DB_PATH = path.join(__dirname, '..', 'database', 'welcome4.json');

function loadWelcome4Data() {
  try {
    if (fs.existsSync(WELCOME4_DB_PATH)) return JSON.parse(fs.readFileSync(WELCOME4_DB_PATH, 'utf8'));
    return {};
  } catch { return {}; }
}

function saveWelcome4Data(data) {
  try {
    const dbDir = path.dirname(WELCOME4_DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(WELCOME4_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function getWelcome4Config(groupId) {
  const data = loadWelcome4Data();
  return data[groupId] || null;
}

function isActiveWelcome4Group(groupId) {
  const data = loadWelcome4Data();
  return data[groupId]?.active === true;
}

function getCustomWelcome4Message(groupId) {
  const data = loadWelcome4Data();
  return data[groupId]?.customMessage || 'Bem-vindo ao {grupo}! Olá {nome}, seja bem-vindo(a)! 🎉';
}

// ✅ NOVO: atualiza o nome do grupo no JSON sempre que o welcome dispara
function updateGroupName(groupId, groupName) {
  const data = loadWelcome4Data();
  if (data[groupId] && groupName) {
    data[groupId].groupName = groupName;
    saveWelcome4Data(data);
  }
}

async function handleWelcome4NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  pushname,
  sendTextWithMention,
}) {
  try {
    if (!isActiveWelcome4Group(groupId)) return;

    // ✅ Auto-corrige o nome do grupo no JSON
    updateGroupName(groupId, groupName);

    const customMessage = getCustomWelcome4Message(groupId);
    const welcomeMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Este Grupo')
      .replace(/{membro}/g, `@${newMemberNumber}`)
      .replace(/{nome}/g, pushname || 'Novo Membro');

    await sendTextWithMention({ caption: welcomeMessage, mentions: [newMemberId] });
  } catch {}
}

module.exports = {
  handleWelcome4NewMember,
  isActiveWelcome4Group,
  getCustomWelcome4Message,
  getWelcome4Config,
  loadWelcome4Data,
  saveWelcome4Data,
  updateGroupName,
};
