const fs = require('fs');
const path = require('path');

const WELCOME2_DB_PATH = path.join(__dirname, '..', 'database', 'welcome2.json');

function loadWelcome2Data() {
  try {
    if (fs.existsSync(WELCOME2_DB_PATH)) {
      const data = fs.readFileSync(WELCOME2_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch {
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
  } catch {}
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
  return data[groupId] && data[groupId].customMessage
    ? data[groupId].customMessage
    : 'Bem-vindo ao {grupo}! Olá {membro}, seja bem-vindo(a)! 🎉';
}

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
    if (!isActiveWelcome2Group(groupId)) {
      return;
    }

    let profilePicture = null;
    try {
      profilePicture = await getProfilePicture(newMemberId);
    } catch {
      profilePicture = null;
    }

    const customMessage = getCustomWelcomeMessage(groupId);
    const welcomeMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Este Grupo')
      .replace(/{membro}/g, `@${newMemberNumber}`);

    if (profilePicture) {
      await sendImageWithCaption({
        image: profilePicture,
        caption: welcomeMessage,
        mentions: [newMemberId]
      });
    } else {
      await sendTextWithMention({
        caption: welcomeMessage,
        mentions: [newMemberId]
      });
    }
  } catch {}
}

module.exports = {
  handleWelcome2NewMember,
  isActiveWelcome2Group,
  getCustomWelcomeMessage,
  getWelcome2Config,
  loadWelcome2Data,
  saveWelcome2Data
};