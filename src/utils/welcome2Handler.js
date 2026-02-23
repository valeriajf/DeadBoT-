const fs = require('fs');
const path = require('path');

const WELCOME2_DB_PATH = path.join(__dirname, '..', 'database', 'welcome2.json');

function loadWelcome2Data() {
  try {
    if (fs.existsSync(WELCOME2_DB_PATH)) return JSON.parse(fs.readFileSync(WELCOME2_DB_PATH, 'utf8'));
    return {};
  } catch { return {}; }
}

function saveWelcome2Data(data) {
  try {
    const dbDir = path.dirname(WELCOME2_DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(WELCOME2_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function getWelcome2Config(groupId) {
  const data = loadWelcome2Data();
  return data[groupId] || null;
}

function isActiveWelcome2Group(groupId) {
  const data = loadWelcome2Data();
  return data[groupId]?.active === true;
}

function getCustomWelcomeMessage(groupId) {
  const data = loadWelcome2Data();
  return data[groupId]?.customMessage || 'Bem-vindo ao {grupo}! Ola {membro}, seja bem-vindo(a)!';
}

function updateGroupName(groupId, groupName) {
  const data = loadWelcome2Data();
  if (data[groupId] && groupName) {
    data[groupId].groupName = groupName;
    saveWelcome2Data(data);
  }
}

async function handleWelcome2NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  sendImageWithCaption,
  sendTextWithMention,
  getProfilePicture,
}) {
  try {
    if (!isActiveWelcome2Group(groupId)) return;

    updateGroupName(groupId, groupName);

    let profilePicture = null;
    try { profilePicture = await getProfilePicture(newMemberId); } catch {}

    const customMessage = getCustomWelcomeMessage(groupId);
    const welcomeMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Este Grupo')
      .replace(/{membro}/g, `@${newMemberNumber}`);

    if (profilePicture) {
      await sendImageWithCaption({ image: profilePicture, caption: welcomeMessage, mentions: [newMemberId] });
    } else {
      await sendTextWithMention({ caption: welcomeMessage, mentions: [newMemberId] });
    }
  } catch (err) {
    console.error('[WELCOME2] Erro:', err.message);
  }
}

module.exports = {
  handleWelcome2NewMember,
  isActiveWelcome2Group,
  getCustomWelcomeMessage,
  getWelcome2Config,
  loadWelcome2Data,
  saveWelcome2Data,
  updateGroupName,
};
