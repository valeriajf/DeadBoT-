const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração do welcome3
const WELCOME3_DB_PATH = path.join(`${BASE_DIR}`, 'database', 'welcome3.json');

// Funções para gerenciar o welcome3
function loadWelcome3Data() {
  try {
    if (fs.existsSync(WELCOME3_DB_PATH)) {
      const data = fs.readFileSync(WELCOME3_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Erro ao carregar welcome3.json:', error);
    return {};
  }
}

function saveWelcome3Data(data) {
  try {
    // Garante que o diretório existe
    const dbDir = path.dirname(WELCOME3_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(WELCOME3_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar welcome3.json:', error);
  }
}

function activateWelcome3Group(groupId) {
  const data = loadWelcome3Data();
  if (!data[groupId]) {
    data[groupId] = {
      active: true,
      customMessage: null // Será definida pelo legenda-bv3
    };
  } else {
    data[groupId].active = true;
  }
  saveWelcome3Data(data);
}

function deactivateWelcome3Group(groupId) {
  const data = loadWelcome3Data();
  if (data[groupId]) {
    data[groupId].active = false;
  }
  saveWelcome3Data(data);
}

function isActiveWelcome3Group(groupId) {
  const data = loadWelcome3Data();
  return data[groupId] && data[groupId].active === true;
}

module.exports = {
  name: "welcome3",
  description: "Ativo/desativo o recurso de boas-vindas com foto do grupo.",
  commands: [
    "welcome3",
    "bemvindo3",
    "boasvinda3",
    "boasvindas3",
    "boavinda3",
    "boavindas3",
    "welkom3",
    "welkon3",
  ],
  usage: `${PREFIX}welcome3 (1/0)`,
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

    const hasActive = welcome && isActiveWelcome3Group(remoteJid);
    const hasInactive = notWelcome && !isActiveWelcome3Group(remoteJid);

    if (hasActive || hasInactive) {
      throw new WarningError(
        `O recurso de boas-vindas com foto do grupo já está ${
          welcome ? "ativado" : "desativado"
        }!`
      );
    }

    if (welcome) {
      activateWelcome3Group(remoteJid);
    } else {
      deactivateWelcome3Group(remoteJid);
    }

    await sendSuccessReact();

    const context = welcome ? "ativado" : "desativado";

    await sendReply(
      `Recurso de boas-vindas com foto do grupo ${context} com sucesso!\n\n` +
      (welcome ? 
        `💡 *Dica:* Use o comando \`${PREFIX}legenda-bv3\` para personalizar a mensagem de boas-vindas deste grupo!` : 
        '')
    );
  },
};