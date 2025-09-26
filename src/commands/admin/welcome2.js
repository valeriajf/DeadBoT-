const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração do welcome2
const WELCOME2_DB_PATH = path.join(`${BASE_DIR}`, 'database', 'welcome2.json');

// Funções para gerenciar o welcome2
function loadWelcome2Data() {
  try {
    if (fs.existsSync(WELCOME2_DB_PATH)) {
      const data = fs.readFileSync(WELCOME2_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Erro ao carregar welcome2.json:', error);
    return {};
  }
}

function saveWelcome2Data(data) {
  try {
    // Garante que o diretório existe
    const dbDir = path.dirname(WELCOME2_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(WELCOME2_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar welcome2.json:', error);
  }
}

function activateWelcome2Group(groupId) {
  const data = loadWelcome2Data();
  if (!data[groupId]) {
    data[groupId] = {
      active: true,
      customMessage: null // Será definida pelo legenda-bv
    };
  } else {
    data[groupId].active = true;
  }
  saveWelcome2Data(data);
}

function deactivateWelcome2Group(groupId) {
  const data = loadWelcome2Data();
  if (data[groupId]) {
    data[groupId].active = false;
  }
  saveWelcome2Data(data);
}

function isActiveWelcome2Group(groupId) {
  const data = loadWelcome2Data();
  return data[groupId] && data[groupId].active === true;
}

module.exports = {
  name: "welcome2",
  description: "Ativo/desativo o recurso de boas-vindas personalizado com foto no grupo.",
  commands: [
    "welcome2",
    "bemvindo2",
    "boasvinda2",
    "boasvindas2",
    "boavinda2",
    "boavindas2",
    "welkom2",
    "welkon2",
  ],
  usage: `${PREFIX}welcome2 (1/0)`,
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

    const hasActive = welcome && isActiveWelcome2Group(remoteJid);
    const hasInactive = notWelcome && !isActiveWelcome2Group(remoteJid);

    if (hasActive || hasInactive) {
      throw new WarningError(
        `O recurso de boas-vindas personalizado já está ${
          welcome ? "ativado" : "desativado"
        }!`
      );
    }

    if (welcome) {
      activateWelcome2Group(remoteJid);
    } else {
      deactivateWelcome2Group(remoteJid);
    }

    await sendSuccessReact();

    const context = welcome ? "ativado" : "desativado";

    await sendReply(
      `Recurso de boas-vindas personalizado ${context} com sucesso!\n\n` +
      (welcome ? 
        `💡 *Dica:* Use o comando \`${PREFIX}legenda-bv\` para personalizar a mensagem de boas-vindas deste grupo!` : 
        '')
    );
  },
};