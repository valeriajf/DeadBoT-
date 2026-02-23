const { PREFIX } = require(`${BASE_DIR}/config`);
const { WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

// Todos os JSONs de welcome — caminho relativo ao arquivo do comando
const WELCOME_DBS = {
  welcome2: path.join(__dirname, '..', '..', 'database', 'welcome2.json'),
  welcome3: path.join(__dirname, '..', '..', 'database', 'welcome3.json'),
  welcome4: path.join(__dirname, '..', '..', 'database', 'welcome4.json'),
  welcome5: path.join(__dirname, '..', '..', 'database', 'welcome5.json'),
  welcome6: path.join(__dirname, '..', '..', 'database', 'welcome6.json'),
  welcome7: path.join(__dirname, '..', '..', 'database', 'welcome7.json'),
};

function loadJson(filePath) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {};
  } catch { return {}; }
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

module.exports = {
  name: "welcome-reset",
  description: "Apaga todos os dados de welcome do grupo atual.",
  commands: ["welcome-reset", "bv-reset", "reset-welcome"],
  usage: `${PREFIX}welcome-reset`,
  handle: async ({ sendReply, sendSuccessReact, remoteJid }) => {
    const removedFrom = [];
    const wasActive = [];

    for (const [name, dbPath] of Object.entries(WELCOME_DBS)) {
      const data = loadJson(dbPath);
      if (data[remoteJid]) {
        if (data[remoteJid].active === true) wasActive.push(name);
        delete data[remoteJid];
        saveJson(dbPath, data);
        removedFrom.push(name);
      }
    }

    if (removedFrom.length === 0) {
      throw new WarningError(
        "Este grupo nao tem nenhuma configuracao de welcome salva para apagar!"
      );
    }

    await sendSuccessReact();

    const activeList = wasActive.length > 0
      ? "\n\nEstavam ativos: " + wasActive.join(', ')
      : '';

    await sendReply(
      "Dados de welcome deste grupo apagados com sucesso!\n\n" +
      "Removido de: " + removedFrom.join(', ') +
      activeList +
      "\n\nPara configurar novamente, use " + PREFIX + "welcome2, " + PREFIX + "welcome3, etc."
    );
  },
};
