const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX } = require(`${BASE_DIR}/config`);
const fs = require('fs');
const path = require('path');

// ✅ CORRIGIDO: salva direto no src/database/
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

function setWelcome6Caption(groupId, caption) {
  const data = loadWelcome6Data();
  if (!data[groupId]) data[groupId] = {};
  data[groupId].customMessage = caption;
  saveWelcome6Data(data);
}

module.exports = {
  name: "legenda-bv6",
  description: "Define a legenda do vídeo de boas-vindas",
  commands: ["legenda-bv6"],
  usage: `${PREFIX}legenda-bv6 <texto>`,
  handle: async ({ args, isGroup, remoteJid, sendSuccessReply, fullArgs }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Somente em grupos!");
    }

    if (!args.length) {
      throw new InvalidParameterError(
        `❌ Forneça um texto!\n\n` +
          `Uso: ${PREFIX}legenda-bv6 Bem-vindo {membro} ao {grupo}!\n\n` +
          `📋 Placeholders disponíveis:\n` +
          `• {membro} ou @member - Menciona o membro\n` +
          `• {grupo} ou @group - Nome do grupo\n\n` +
          `💡 Use o formato que preferir!`
      );
    }

    const caption = fullArgs.trim();
    setWelcome6Caption(remoteJid, caption);

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
        `💡 Placeholders suportados:\n` +
        `• {membro} @member [membro] {{membro}}\n` +
        `• {grupo} @group [grupo] {{grupo}}`
    );
  },
};
