const fs = require('fs');
const path = require('path');

// ✅ CORRIGIDO: movido de database/ raiz para src/database/
const WELCOME7_DB_PATH = path.join(__dirname, '..', 'database', 'welcome7.json');

function loadWelcome7Data() {
  try {
    if (fs.existsSync(WELCOME7_DB_PATH)) return JSON.parse(fs.readFileSync(WELCOME7_DB_PATH, 'utf8'));
    return {};
  } catch { return {}; }
}

function saveWelcome7Data(data) {
  try {
    const dbDir = path.dirname(WELCOME7_DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(WELCOME7_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function getWelcome7Config(groupId) {
  const data = loadWelcome7Data();
  return data[groupId] || null;
}

function isActiveWelcome7Group(groupId) {
  const data = loadWelcome7Data();
  return data[groupId]?.active === true;
}

function getCustomWelcome7Message(groupId) {
  const data = loadWelcome7Data();
  return data[groupId]?.customMessage || 'Bem-vindo ao {grupo}! Olá {membro}, seja bem-vindo(a)! 🎉';
}

function getWelcome7Gif(groupId) {
  const data = loadWelcome7Data();
  return data[groupId]?.gifPath || null;
}

function getWelcome7Audio(groupId) {
  const data = loadWelcome7Data();
  return data[groupId]?.audioPath || null;
}

// ✅ NOVO: atualiza o nome do grupo no JSON sempre que o welcome dispara
function updateGroupName(groupId, groupName) {
  const data = loadWelcome7Data();
  if (data[groupId] && groupName) {
    data[groupId].groupName = groupName;
    saveWelcome7Data(data);
  }
}

async function handleWelcome7NewMember({
  groupId,
  groupName,
  newMemberId,
  newMemberNumber,
  pushname,
  sendGifFromFile,
  sendAudioFromFile,
  sendTextWithMention,
}) {
  try {
    if (!isActiveWelcome7Group(groupId)) return;

    // ✅ Auto-corrige o nome do grupo no JSON
    updateGroupName(groupId, groupName);

    const gifPath = getWelcome7Gif(groupId);
    const audioPath = getWelcome7Audio(groupId);

    // Comportamento original: só dispara se tiver GIF e áudio configurados
    if (!gifPath || !fs.existsSync(gifPath)) return;
    if (!audioPath || !fs.existsSync(audioPath)) return;

    const customMessage = getCustomWelcome7Message(groupId);
    const caption = customMessage
      .replace(/{membro}/gi, `@${newMemberNumber}`)
      .replace(/{grupo}/gi, groupName || 'Este Grupo')
      .replace(/{nome}/gi, pushname || 'Novo Membro');

    // 1. Envia GIF
    await sendGifFromFile(gifPath, null, null);
    // 2. Aguarda 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    // 3. Envia áudio
    await sendAudioFromFile(audioPath);
    // 4. Aguarda 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    // 5. Envia texto com menção
    await sendTextWithMention({ caption, mentions: [newMemberId] });

  } catch (error) {
    console.error(`[WELCOME7] Erro: ${error.message}`);
    try {
      await sendTextWithMention({ caption: `Bem-vindo(a), @${newMemberNumber}! 👋`, mentions: [newMemberId] });
    } catch {}
  }
}

module.exports = {
  handleWelcome7NewMember,
  isActiveWelcome7Group,
  getCustomWelcome7Message,
  getWelcome7Config,
  getWelcome7Gif,
  getWelcome7Audio,
  loadWelcome7Data,
  saveWelcome7Data,
  updateGroupName,
};
