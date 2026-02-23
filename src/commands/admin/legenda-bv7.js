const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX } = require(`${BASE_DIR}/config`);
const fs = require('fs');
const path = require('path');

// ✅ CORRIGIDO: salva direto no src/database/
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

function setWelcome7Caption(groupId, caption) {
  const data = loadWelcome7Data();
  if (!data[groupId]) data[groupId] = {};
  data[groupId].customMessage = caption;
  saveWelcome7Data(data);
}

module.exports = {
  name: "legenda-bv7",
  description: "Define a legenda do GIF de boas-vindas",
  commands: ["legenda-bv7"],
  usage: `${PREFIX}legenda-bv7 <texto>`,
  handle: async ({ args, isGroup, remoteJid, sendSuccessReply, fullArgs }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Somente em grupos!");
    }

    if (!args.length) {
      throw new InvalidParameterError(
        `❌ Forneça um texto!\n\n` +
          `Uso: ${PREFIX}legenda-bv7 Bem-vindo {membro} ao {grupo}!\n\n` +
          `📋 Placeholders disponíveis:\n` +
          `• {membro} ou @member - Menciona o membro\n` +
          `• {grupo} ou @group - Nome do grupo\n\n` +
          `💡 Use o formato que preferir!`
      );
    }

    const caption = fullArgs.trim();
    setWelcome7Caption(remoteJid, caption);

    const preview = caption
      .replace(/{membro}/gi, "@usuario")
      .replace(/{grupo}/gi, "Nome do Grupo")
      .replace(/@member/gi, "@usuario")
      .replace(/@group/gi, "Nome do Grupo")
      .replace(/\[membro\]/gi, "@usuario")
      .replace(/\[grupo\]/gi, "Nome do Grupo")
      .replace(/{{membro}}/gi, "@usuario")
      .replace(/{{grupo}}/gi, "Nome do Grupo");

    await sendSuccessReply(
      `✅ Legenda configurada!\n\n` +
        `📝 Preview:\n${preview}\n\n` +
        `💡 Esta legenda aparecerá no GIF`
    );
  },
};
