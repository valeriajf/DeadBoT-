const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

const WELCOME3_DB_PATH = path.join(__dirname, '..', '..', 'database', 'welcome3.json');

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

function activateWelcome3Group(groupId, groupName) {
  const data = loadWelcome3Data();
  if (!data[groupId]) {
    data[groupId] = { active: true, groupName: groupName || null, customMessage: null };
  } else {
    data[groupId].active = true;
    if (groupName) data[groupId].groupName = groupName;
  }
  saveWelcome3Data(data);
}

function deactivateWelcome3Group(groupId) {
  const data = loadWelcome3Data();
  if (data[groupId]) data[groupId].active = false;
  saveWelcome3Data(data);
}

function isActiveWelcome3Group(groupId) {
  const data = loadWelcome3Data();
  return data[groupId]?.active === true;
}

module.exports = {
  name: "welcome3",
  description: "Ativa/desativa boas-vindas com foto do grupo.",
  commands: ["welcome3", "bemvindo3", "boasvinda3", "boasvindas3", "boavinda3", "boavindas3", "welkom3", "welkon3"],
  usage: `${PREFIX}welcome3 (1/0)`,
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, getGroupName }) => {
    if (!args.length || !["1", "0"].includes(args[0])) {
      throw new InvalidParameterError("Voce precisa digitar 1 ou 0 (ligar ou desligar)!");
    }

    const welcome = args[0] === "1";
    const isActive = isActiveWelcome3Group(remoteJid);

    if (welcome && isActive) throw new WarningError("O welcome3 ja esta ativado!");
    if (!welcome && !isActive) throw new WarningError("O welcome3 ja esta desativado!");

    if (welcome) {
      const groupName = await getGroupName();
      activateWelcome3Group(remoteJid, groupName);
    } else {
      deactivateWelcome3Group(remoteJid);
    }

    await sendSuccessReact();
    await sendReply(
      "Boas-vindas com foto do grupo " + (welcome ? "ativadas" : "desativadas") + " com sucesso!\n\n" +
      (welcome ? "Dica: Use `" + PREFIX + "legenda-bv3` para personalizar a mensagem!" : '')
    );
  },
};
