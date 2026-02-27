const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX } = require(`${BASE_DIR}/config`);
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

function setWelcome8Caption(groupId, caption) {
  const data = loadWelcome8Data();
  if (!data[groupId]) data[groupId] = {};
  data[groupId].customMessage = caption;
  saveWelcome8Data(data);
}

module.exports = {
  name: "legenda-bv8",
  description: "Define a legenda da foto de boas-vindas",
  commands: ["legenda-bv8"],
  usage: `${PREFIX}legenda-bv8 <texto>`,
  handle: async ({ args, isGroup, remoteJid, sendSuccessReply, fullArgs }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Somente em grupos!");
    }

    if (!args.length) {
      throw new InvalidParameterError(
        `❌ Forneça um texto!\n\n` +
          `Uso: ${PREFIX}legenda-bv8 Bem-vindo {membro} ao {grupo}!\n\n` +
          `📋 Placeholders disponíveis:\n` +
          `• {membro} - Menciona o novo membro\n` +
          `• {grupo} - Nome do grupo\n` +
          `• {nome} - Nome/pushname do membro\n\n` +
          `💡 Exemplo: Olá {membro}, seja bem-vindo(a) ao {grupo}! 🎉`
      );
    }

    const caption = fullArgs.trim();
    setWelcome8Caption(remoteJid, caption);

    const preview = caption
      .replace(/{membro}/gi, "@usuario")
      .replace(/{grupo}/gi, "Nome do Grupo")
      .replace(/{nome}/gi, "João")
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
        `• {grupo} @group [grupo] {{grupo}}\n` +
        `• {nome} - pushname do membro`
    );
  },
};
