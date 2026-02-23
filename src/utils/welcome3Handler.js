const fs = require('fs');
const path = require('path');

const WELCOME3_DB_PATH = path.join(__dirname, '..', 'database', 'welcome3.json');

function loadWelcome3Data() {
  try {
    if (fs.existsSync(WELCOME3_DB_PATH)) return JSON.parse(fs.readFileSync(WELCOME3_DB_PATH, 'utf8'));
    return {};
  } catch { return {}; }
}

function saveWelcome3Data(data) {
  try {
    const dbDir = path.dirname(WELCOME3_DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(WELCOME3_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function getWelcome3Config(groupId) {
  const data = loadWelcome3Data();
  return data[groupId] || null;
}

function isActiveWelcome3Group(groupId) {
  const data = loadWelcome3Data();
  return data[groupId]?.active === true;
}

function getCustomWelcome3Message(groupId) {
  const data = loadWelcome3Data();
  return data[groupId]?.customMessage || 'Bem-vindo ao {grupo}! Olá {membro}, seja bem-vindo(a)! 🎉';
}

// ✅ NOVO: atualiza o nome do grupo no JSON sempre que o welcome dispara
function updateGroupName(groupId, groupName) {
  const data = loadWelcome3Data();
  if (data[groupId] && groupName) {
    data[groupId].groupName = groupName;
    saveWelcome3Data(data);
  }
}

async function handleWelcome3NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  pushname,
  sendImageWithCaption,
  sendTextWithMention,
  getGroupPicture,
}) {
  try {
    if (!isActiveWelcome3Group(groupId)) return;

    // ✅ Auto-corrige o nome do grupo no JSON
    updateGroupName(groupId, groupName);

    let groupPicture = null;
    try { groupPicture = await getGroupPicture(groupId); } catch {}

    const customMessage = getCustomWelcome3Message(groupId);
    const welcomeMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Este Grupo')
      .replace(/{membro}/g, `@${newMemberNumber}`)
      .replace(/{nome}/g, pushname || `@${newMemberNumber}`);

    if (groupPicture) {
      await sendImageWithCaption({ image: groupPicture, caption: welcomeMessage, mentions: [newMemberId] });
    } else {
      await sendTextWithMention({ caption: welcomeMessage, mentions: [newMemberId] });
    }
  } catch {}
}

module.exports = {
  handleWelcome3NewMember,
  isActiveWelcome3Group,
  getCustomWelcome3Message,
  getWelcome3Config,
  loadWelcome3Data,
  saveWelcome3Data,
  updateGroupName,
};
