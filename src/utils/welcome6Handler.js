const fs = require('fs');
const path = require('path');

// ✅ CORRIGIDO: movido de database/ raiz para src/database/
const WELCOME6_DB_PATH = path.join(__dirname, '..', 'database', 'welcome6.json');

function loadWelcome6Data() {
  try {
    if (fs.existsSync(WELCOME6_DB_PATH)) return JSON.parse(fs.readFileSync(WELCOME6_DB_PATH, 'utf8'));
    return {};
  } catch { return {}; }
}

function saveWelcome6Data(data) {
  try {
    const dbDir = path.dirname(WELCOME6_DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(WELCOME6_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function getWelcome6Config(groupId) {
  const data = loadWelcome6Data();
  return data[groupId] || null;
}

function isActiveWelcome6Group(groupId) {
  const data = loadWelcome6Data();
  return data[groupId]?.active === true;
}

function getCustomWelcome6Message(groupId) {
  const data = loadWelcome6Data();
  return data[groupId]?.customMessage || 'Bem-vindo ao {grupo}! Olá {membro}, seja bem-vindo(a)! 🎉';
}

function getWelcome6Video(groupId) {
  const data = loadWelcome6Data();
  return data[groupId]?.videoPath || null;
}

// ✅ NOVO: atualiza o nome do grupo no JSON sempre que o welcome dispara
function updateGroupName(groupId, groupName) {
  const data = loadWelcome6Data();
  if (data[groupId] && groupName) {
    data[groupId].groupName = groupName;
    saveWelcome6Data(data);
  }
}

async function handleWelcome6NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  pushname,
  sendVideoFromFile,
  sendTextWithMention,
}) {
  try {
    if (!isActiveWelcome6Group(groupId)) return;

    // ✅ Auto-corrige o nome do grupo no JSON
    updateGroupName(groupId, groupName);

    const videoPath = getWelcome6Video(groupId);

    // Sem vídeo configurado: não faz nada (comportamento original mantido)
    if (!videoPath || !fs.existsSync(videoPath)) return;

    const customMessage = getCustomWelcome6Message(groupId);
    const caption = customMessage
      .replace(/{membro}/gi, `@${newMemberNumber}`)
      .replace(/{grupo}/gi, groupName || 'Este Grupo')
      .replace(/{nome}/gi, pushname || 'Novo Membro');

    await sendVideoFromFile(videoPath, caption, [newMemberId]);

  } catch (error) {
    console.error(`[WELCOME6] Erro: ${error.message}`);
    try {
      await sendTextWithMention({ caption: `Bem-vindo(a), @${newMemberNumber}! 👋`, mentions: [newMemberId] });
    } catch {}
  }
}

module.exports = {
  handleWelcome6NewMember,
  isActiveWelcome6Group,
  getCustomWelcome6Message,
  getWelcome6Config,
  getWelcome6Video,
  loadWelcome6Data,
  saveWelcome6Data,
  updateGroupName,
};
