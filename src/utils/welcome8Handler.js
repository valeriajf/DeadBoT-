const fs = require('fs');
const path = require('path');

const WELCOME8_DB_PATH = path.join(__dirname, '..', 'database', 'welcome8.json');

function loadWelcome8Data() {
  try {
    if (fs.existsSync(WELCOME8_DB_PATH)) return JSON.parse(fs.readFileSync(WELCOME8_DB_PATH, 'utf8'));
    return {};
  } catch { return {}; }
}

function saveWelcome8Data(data) {
  try {
    const dbDir = path.dirname(WELCOME8_DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(WELCOME8_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function getWelcome8Config(groupId) {
  const data = loadWelcome8Data();
  return data[groupId] || null;
}

function isActiveWelcome8Group(groupId) {
  const data = loadWelcome8Data();
  return data[groupId]?.active === true;
}

function getCustomWelcome8Message(groupId) {
  const data = loadWelcome8Data();
  return data[groupId]?.customMessage || 'Bem-vindo ao {grupo}! Olá {membro}, seja bem-vindo(a)! 🎉';
}

function getWelcome8Photo(groupId) {
  const data = loadWelcome8Data();
  return data[groupId]?.photoPath || null;
}

function updateGroupName(groupId, groupName) {
  const data = loadWelcome8Data();
  if (data[groupId] && groupName) {
    data[groupId].groupName = groupName;
    saveWelcome8Data(data);
  }
}

async function handleWelcome8NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  pushname,
  sendImageFromFile,
  sendTextWithMention,
}) {
  try {
    if (!isActiveWelcome8Group(groupId)) return;

    // Auto-atualiza o nome do grupo no JSON
    updateGroupName(groupId, groupName);

    const photoPath = getWelcome8Photo(groupId);

    // Se não houver foto configurada, envia só texto de boas-vindas
    const customMessage = getCustomWelcome8Message(groupId);
    const caption = customMessage
      .replace(/{membro}/gi, `@${newMemberNumber}`)
      .replace(/{grupo}/gi, groupName || 'Este Grupo')
      .replace(/{nome}/gi, pushname || 'Novo Membro');

    if (photoPath && fs.existsSync(photoPath)) {
      // Envia foto com legenda e menção
      await sendImageFromFile(photoPath, caption, [newMemberId]);
    } else {
      // Sem foto configurada: envia apenas texto com menção
      await sendTextWithMention({ caption, mentions: [newMemberId] });
    }

  } catch (error) {
    console.error(`[WELCOME8] Erro: ${error.message}`);
    try {
      await sendTextWithMention({ caption: `Bem-vindo(a), @${newMemberNumber}! 👋`, mentions: [newMemberId] });
    } catch {}
  }
}

module.exports = {
  handleWelcome8NewMember,
  isActiveWelcome8Group,
  getCustomWelcome8Message,
  getWelcome8Config,
  getWelcome8Photo,
  loadWelcome8Data,
  saveWelcome8Data,
  updateGroupName,
};
