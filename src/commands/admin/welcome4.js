const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração do welcome4
const WELCOME4_DB_PATH = path.join(`${BASE_DIR}`, 'database', 'welcome4.json');

// Funções para gerenciar o welcome4
function loadWelcome4Data() {
  try {
    if (fs.existsSync(WELCOME4_DB_PATH)) {
      const data = fs.readFileSync(WELCOME4_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Erro ao carregar welcome4.json:', error);
    return {};
  }
}

function saveWelcome4Data(data) {
  try {
    // Garante que o diretório existe
    const dbDir = path.dirname(WELCOME4_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(WELCOME4_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar welcome4.json:', error);
  }
}

function activateWelcome4Group(groupId) {
  const data = loadWelcome4Data();
  if (!data[groupId]) {
    data[groupId] = {
      active: true,
      customMessage: null // Será definida pelo legenda-bv4
    };
  } else {
    data[groupId].active = true;
  }
  saveWelcome4Data(data);
}

function deactivateWelcome4Group(groupId) {
  const data = loadWelcome4Data();
  if (data[groupId]) {
    data[groupId].active = false;
  }
  saveWelcome4Data(data);
}

function isActiveWelcome4Group(groupId) {
  const data = loadWelcome4Data();
  return data[groupId] && data[groupId].active === true;
}

module.exports = {
  name: "welcome4",
  description: "Ativo/desativo o recurso de boas-vindas apenas com texto (sem foto).",
  commands: [
    "welcome4",
    "bemvindo4",
    "boasvinda4",
    "boasvindas4",
    "boavinda4",
    "boavindas4",
    "welkom4",
    "welkon4",
  ],
  usage: `${PREFIX}welcome4 (1/0)`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid }) => {
    if (!args.length) {
      throw new InvalidParameterError(
        "Você precisa digitar 1 ou 0 (ligar ou desligar)!"
      );
    }

    const welcome = args[0] == "1";
    const notWelcome = args[0] == "0";

    if (!welcome && !notWelcome) {
      throw new InvalidParameterError(
        "Você precisa digitar 1 ou 0 (ligar ou desligar)!"
      );
    }

    const hasActive = welcome && isActiveWelcome4Group(remoteJid);
    const hasInactive = notWelcome && !isActiveWelcome4Group(remoteJid);

    if (hasActive || hasInactive) {
      throw new WarningError(
        `O recurso de boas-vindas apenas com texto já está ${
          welcome ? "ativado" : "desativado"
        }!`
      );
    }

    if (welcome) {
      activateWelcome4Group(remoteJid);
    } else {
      deactivateWelcome4Group(remoteJid);
    }

    await sendSuccessReact();

    const context = welcome ? "ativado" : "desativado";

    await sendReply(
      `Recurso de boas-vindas apenas com texto ${context} com sucesso!\n\n` +
      (welcome ? 
        `💡 *Dica:* Use o comando \`${PREFIX}legenda-bv4\` para personalizar a mensagem de boas-vindas deste grupo!` : 
        '')
    );
  },
};