const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

const WELCOME5_DB_PATH = path.join(__dirname, '..', '..', 'database', 'welcome5.json');

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

function activateWelcome5Group(groupId, groupName) {
  const data = loadWelcome5Data();
  if (!data[groupId]) {
    data[groupId] = { active: true, groupName: groupName || null, customMessage: null, gifFileName: null };
  } else {
    data[groupId].active = true;
    if (groupName) data[groupId].groupName = groupName;
  }
  saveWelcome5Data(data);
}

function deactivateWelcome5Group(groupId) {
  const data = loadWelcome5Data();
  if (data[groupId]) data[groupId].active = false;
  saveWelcome5Data(data);
}

function isActiveWelcome5Group(groupId) {
  const data = loadWelcome5Data();
  return data[groupId]?.active === true;
}

function getGifFileName(groupId) {
  const data = loadWelcome5Data();
  return data[groupId]?.gifFileName || null;
}

function getCustomWelcome5Message(groupId) {
  const data = loadWelcome5Data();
  return data[groupId]?.customMessage || null;
}

module.exports = {
  name: "welcome5",
  description: "Ativa/desativa boas-vindas com GIF.",
  commands: ["welcome5", "bemvindo5", "boasvinda5", "bv5"],
  usage: `${PREFIX}welcome5 (1/0)`,
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, getGroupName }) => {
    if (!args.length || !["1", "0"].includes(args[0])) {
      throw new InvalidParameterError("Voce precisa digitar 1 ou 0 (ligar ou desligar)!");
    }

    const welcome = args[0] === "1";
    const isActive = isActiveWelcome5Group(remoteJid);

    if (welcome && isActive) throw new WarningError("O welcome5 ja esta ativado!");
    if (!welcome && !isActive) throw new WarningError("O welcome5 ja esta desativado!");

    if (welcome) {
      const groupName = await getGroupName();
      activateWelcome5Group(remoteJid, groupName);
    } else {
      deactivateWelcome5Group(remoteJid);
    }

    await sendSuccessReact();

    if (welcome) {
      const gifFile = getGifFileName(remoteJid);
      const customMsg = getCustomWelcome5Message(remoteJid);
      await sendReply(
        "Boas-vindas com GIF ativadas com sucesso!\n\n" +
        "Status atual:\n" +
        "GIF: " + (gifFile ? "Configurado" : "Nao configurado - use " + PREFIX + "set-gif-bv5 (responder GIF)") + "\n" +
        "Mensagem: " + (customMsg ? "Personalizada" : "Padrao - use " + PREFIX + "legenda-bv5 para personalizar")
      );
    } else {
      await sendReply("Boas-vindas com GIF desativadas com sucesso!");
    }
  },
};
