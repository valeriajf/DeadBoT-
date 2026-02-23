const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

const WELCOME7_DB_PATH = path.join(__dirname, '..', '..', 'database', 'welcome7.json');

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

function activateWelcome7Group(groupId, groupName) {
  const data = loadWelcome7Data();
  if (!data[groupId]) {
    data[groupId] = { active: true, groupName: groupName || null, customMessage: null, gifPath: null, audioPath: null };
  } else {
    data[groupId].active = true;
    if (groupName) data[groupId].groupName = groupName;
  }
  saveWelcome7Data(data);
}

function deactivateWelcome7Group(groupId) {
  const data = loadWelcome7Data();
  if (data[groupId]) data[groupId].active = false;
  saveWelcome7Data(data);
}

function isActiveWelcome7Group(groupId) {
  const data = loadWelcome7Data();
  return data[groupId]?.active === true;
}

function getGifPath(groupId) {
  const data = loadWelcome7Data();
  return data[groupId]?.gifPath || null;
}

function getAudioPath(groupId) {
  const data = loadWelcome7Data();
  return data[groupId]?.audioPath || null;
}

function getCustomWelcome7Message(groupId) {
  const data = loadWelcome7Data();
  return data[groupId]?.customMessage || null;
}

module.exports = {
  name: "welcome7",
  description: "Ativa/desativa boas-vindas com GIF + Audio.",
  commands: ["welcome7", "bv7"],
  usage: `${PREFIX}welcome7 (1/0)`,
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, getGroupName }) => {
    if (!args.length || !["1", "0"].includes(args[0])) {
      throw new InvalidParameterError("Voce precisa digitar 1 ou 0 (ligar ou desligar)!");
    }

    const welcome = args[0] === "1";
    const isActive = isActiveWelcome7Group(remoteJid);

    if (welcome && isActive) throw new WarningError("O welcome7 ja esta ativado!");
    if (!welcome && !isActive) throw new WarningError("O welcome7 ja esta desativado!");

    if (welcome) {
      const groupName = await getGroupName();
      activateWelcome7Group(remoteJid, groupName);
    } else {
      deactivateWelcome7Group(remoteJid);
    }

    await sendSuccessReact();

    if (welcome) {
      const gifPath = getGifPath(remoteJid);
      const audioPath = getAudioPath(remoteJid);
      const customMsg = getCustomWelcome7Message(remoteJid);
      await sendReply(
        "Boas-vindas com GIF + Audio ativadas com sucesso!\n\n" +
        "Status atual:\n" +
        "GIF: " + (gifPath ? "Configurado" : "Nao configurado - use " + PREFIX + "set-gif-bv7 (responder GIF)") + "\n" +
        "Audio: " + (audioPath ? "Configurado" : "Nao configurado - use " + PREFIX + "set-audio-bv7 (responder audio)") + "\n" +
        "Mensagem: " + (customMsg ? "Personalizada" : "Padrao - use " + PREFIX + "legenda-bv7 para personalizar")
      );
    } else {
      await sendReply("Boas-vindas com GIF + Audio desativadas com sucesso!");
    }
  },
};
