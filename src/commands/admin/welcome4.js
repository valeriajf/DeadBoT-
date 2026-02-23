const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

const WELCOME4_DB_PATH = path.join(__dirname, '..', '..', 'database', 'welcome4.json');

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

function activateWelcome4Group(groupId, groupName) {
  const data = loadWelcome4Data();
  if (!data[groupId]) {
    data[groupId] = { active: true, groupName: groupName || null, customMessage: null };
  } else {
    data[groupId].active = true;
    if (groupName) data[groupId].groupName = groupName;
  }
  saveWelcome4Data(data);
}

function deactivateWelcome4Group(groupId) {
  const data = loadWelcome4Data();
  if (data[groupId]) data[groupId].active = false;
  saveWelcome4Data(data);
}

function isActiveWelcome4Group(groupId) {
  const data = loadWelcome4Data();
  return data[groupId]?.active === true;
}

module.exports = {
  name: "welcome4",
  description: "Ativa/desativa boas-vindas apenas com texto (sem foto).",
  commands: ["welcome4", "bemvindo4", "boasvinda4", "boasvindas4", "boavinda4", "boavindas4", "welkom4", "welkon4"],
  usage: `${PREFIX}welcome4 (1/0)`,
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, getGroupName }) => {
    if (!args.length || !["1", "0"].includes(args[0])) {
      throw new InvalidParameterError("Voce precisa digitar 1 ou 0 (ligar ou desligar)!");
    }

    const welcome = args[0] === "1";
    const isActive = isActiveWelcome4Group(remoteJid);

    if (welcome && isActive) throw new WarningError("O welcome4 ja esta ativado!");
    if (!welcome && !isActive) throw new WarningError("O welcome4 ja esta desativado!");

    if (welcome) {
      const groupName = await getGroupName();
      activateWelcome4Group(remoteJid, groupName);
    } else {
      deactivateWelcome4Group(remoteJid);
    }

    await sendSuccessReact();
    await sendReply(
      "Boas-vindas sem foto (so texto) " + (welcome ? "ativadas" : "desativadas") + " com sucesso!\n\n" +
      (welcome ? "Dica: Use `" + PREFIX + "legenda-bv4` para personalizar a mensagem!" : '')
    );
  },
};
