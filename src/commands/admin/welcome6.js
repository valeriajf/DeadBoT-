const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

const WELCOME6_DB_PATH = path.join(__dirname, '..', '..', 'database', 'welcome6.json');

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

function activateWelcome6Group(groupId, groupName) {
  const data = loadWelcome6Data();
  if (!data[groupId]) {
    data[groupId] = { active: true, groupName: groupName || null, customMessage: null, videoPath: null };
  } else {
    data[groupId].active = true;
    if (groupName) data[groupId].groupName = groupName;
  }
  saveWelcome6Data(data);
}

function deactivateWelcome6Group(groupId) {
  const data = loadWelcome6Data();
  if (data[groupId]) data[groupId].active = false;
  saveWelcome6Data(data);
}

function isActiveWelcome6Group(groupId) {
  const data = loadWelcome6Data();
  return data[groupId]?.active === true;
}

function getVideoPath(groupId) {
  const data = loadWelcome6Data();
  return data[groupId]?.videoPath || null;
}

function getCustomWelcome6Message(groupId) {
  const data = loadWelcome6Data();
  return data[groupId]?.customMessage || null;
}

module.exports = {
  name: "welcome6",
  description: "Ativa/desativa boas-vindas com video.",
  commands: ["welcome6", "bv6"],
  usage: `${PREFIX}welcome6 (1/0)`,
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, getGroupName }) => {
    if (!args.length || !["1", "0"].includes(args[0])) {
      throw new InvalidParameterError("Voce precisa digitar 1 ou 0 (ligar ou desligar)!");
    }

    const welcome = args[0] === "1";
    const isActive = isActiveWelcome6Group(remoteJid);

    if (welcome && isActive) throw new WarningError("O welcome6 ja esta ativado!");
    if (!welcome && !isActive) throw new WarningError("O welcome6 ja esta desativado!");

    if (welcome) {
      const groupName = await getGroupName();
      activateWelcome6Group(remoteJid, groupName);
    } else {
      deactivateWelcome6Group(remoteJid);
    }

    await sendSuccessReact();

    if (welcome) {
      const videoPath = getVideoPath(remoteJid);
      const customMsg = getCustomWelcome6Message(remoteJid);
      await sendReply(
        "Boas-vindas com video ativadas com sucesso!\n\n" +
        "Status atual:\n" +
        "Video: " + (videoPath ? "Configurado" : "Nao configurado - use " + PREFIX + "set-video-bv6 (responder video)") + "\n" +
        "Mensagem: " + (customMsg ? "Personalizada" : "Padrao - use " + PREFIX + "legenda-bv6 para personalizar")
      );
    } else {
      await sendReply("Boas-vindas com video desativadas com sucesso!");
    }
  },
};
