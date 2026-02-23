const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

// ✅ CORRIGIDO: usa __dirname igual ao handler para garantir o mesmo path
// Handler está em src/utils/welcome2Handler.js e lê de src/database/welcome2.json
// Este comando está em src/commands/admin/welcome2.js
// Portanto: __dirname/../../../database = src/database ✅
const WELCOME2_DB_PATH = path.join(__dirname, '..', '..', 'database', 'welcome2.json');

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

function activateWelcome2Group(groupId, groupName) {
  const data = loadWelcome2Data();
  if (!data[groupId]) {
    data[groupId] = { active: true, groupName: groupName || null, customMessage: null };
  } else {
    data[groupId].active = true;
    if (groupName) data[groupId].groupName = groupName;
  }
  saveWelcome2Data(data);
}

function deactivateWelcome2Group(groupId) {
  const data = loadWelcome2Data();
  if (data[groupId]) data[groupId].active = false;
  saveWelcome2Data(data);
}

function isActiveWelcome2Group(groupId) {
  const data = loadWelcome2Data();
  return data[groupId]?.active === true;
}

module.exports = {
  name: "welcome2",
  description: "Ativa/desativa boas-vindas com foto do usuario.",
  commands: ["welcome2", "bemvindo2", "boasvinda2", "boasvindas2", "boavinda2", "boavindas2", "welkom2", "welkon2"],
  usage: `${PREFIX}welcome2 (1/0)`,
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, getGroupName }) => {
    if (!args.length || !["1", "0"].includes(args[0])) {
      throw new InvalidParameterError("Voce precisa digitar 1 ou 0 (ligar ou desligar)!");
    }

    const welcome = args[0] === "1";
    const isActive = isActiveWelcome2Group(remoteJid);

    if (welcome && isActive) throw new WarningError("O welcome2 ja esta ativado!");
    if (!welcome && !isActive) throw new WarningError("O welcome2 ja esta desativado!");

    if (welcome) {
      const groupName = await getGroupName();
      activateWelcome2Group(remoteJid, groupName);
    } else {
      deactivateWelcome2Group(remoteJid);
    }

    await sendSuccessReact();
    await sendReply(
      "Boas-vindas com foto do usuario " + (welcome ? "ativadas" : "desativadas") + " com sucesso!\n\n" +
      (welcome ? "Dica: Use `" + PREFIX + "legenda-bv` para personalizar a mensagem!" : '')
    );
  },
};
