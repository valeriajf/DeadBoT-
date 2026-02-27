const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

const WELCOME8_DB_PATH = path.join(__dirname, '..', '..', 'database', 'welcome8.json');

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

function activateWelcome8Group(groupId, groupName) {
  const data = loadWelcome8Data();
  if (!data[groupId]) {
    data[groupId] = { active: true, groupName: groupName || null, customMessage: null, photoPath: null };
  } else {
    data[groupId].active = true;
    if (groupName) data[groupId].groupName = groupName;
  }
  saveWelcome8Data(data);
}

function deactivateWelcome8Group(groupId) {
  const data = loadWelcome8Data();
  if (data[groupId]) data[groupId].active = false;
  saveWelcome8Data(data);
}

function isActiveWelcome8Group(groupId) {
  const data = loadWelcome8Data();
  return data[groupId]?.active === true;
}

function getPhotoPath(groupId) {
  const data = loadWelcome8Data();
  return data[groupId]?.photoPath || null;
}

function getCustomWelcome8Message(groupId) {
  const data = loadWelcome8Data();
  return data[groupId]?.customMessage || null;
}

module.exports = {
  name: "welcome8",
  description: "Ativa/desativa boas-vindas com foto definida pelo ADM.",
  commands: ["welcome8", "bv8"],
  usage: `${PREFIX}welcome8 (1/0)`,
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, getGroupName }) => {
    if (!args.length || !["1", "0"].includes(args[0])) {
      throw new InvalidParameterError("Você precisa digitar 1 ou 0 (ligar ou desligar)!");
    }

    const welcome = args[0] === "1";
    const isActive = isActiveWelcome8Group(remoteJid);

    if (welcome && isActive) throw new WarningError("O welcome8 já está ativado!");
    if (!welcome && !isActive) throw new WarningError("O welcome8 já está desativado!");

    if (welcome) {
      const groupName = await getGroupName();
      activateWelcome8Group(remoteJid, groupName);
    } else {
      deactivateWelcome8Group(remoteJid);
    }

    await sendSuccessReact();

    if (welcome) {
      const photoPath = getPhotoPath(remoteJid);
      const customMsg = getCustomWelcome8Message(remoteJid);
      await sendReply(
        "✅ Boas-vindas com foto ativadas com sucesso!\n\n" +
        "📊 Status atual:\n" +
        "📷 Foto: " + (photoPath ? "Configurada ✅" : "Não configurada - use " + PREFIX + "set-img-bv8 (responder imagem)") + "\n" +
        "📝 Mensagem: " + (customMsg ? "Personalizada ✅" : "Padrão - use " + PREFIX + "legenda-bv8 para personalizar")
      );
    } else {
      await sendReply("❌ Boas-vindas com foto desativadas com sucesso!");
    }
  },
};
