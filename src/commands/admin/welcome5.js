const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

const WELCOME5_DB_PATH = path.join(`${BASE_DIR}`, 'database', 'welcome5.json');

function loadWelcome5Data() {
  try {
    if (fs.existsSync(WELCOME5_DB_PATH)) {
      const data = fs.readFileSync(WELCOME5_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Erro ao carregar welcome5.json:', error);
    return {};
  }
}

function saveWelcome5Data(data) {
  try {
    const dbDir = path.dirname(WELCOME5_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(WELCOME5_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar welcome5.json:', error);
  }
}

function activateWelcome5Group(groupId) {
  const data = loadWelcome5Data();
  if (!data[groupId]) {
    data[groupId] = {
      active: true,
      customMessage: null,
      gifFileName: null
    };
  } else {
    data[groupId].active = true;
  }
  saveWelcome5Data(data);
}

function deactivateWelcome5Group(groupId) {
  const data = loadWelcome5Data();
  if (data[groupId]) {
    data[groupId].active = false;
  }
  saveWelcome5Data(data);
}

function isActiveWelcome5Group(groupId) {
  const data = loadWelcome5Data();
  return data[groupId] && data[groupId].active === true;
}

function getGifFileName(groupId) {
  const data = loadWelcome5Data();
  return data[groupId]?.gifFileName || null;
}

function getCustomWelcome5Message(groupId) {
  const data = loadWelcome5Data();
  return data[groupId]?.customMessage || null;
}

module.exports = {
  name: "welcome5",
  description: "Ativa/desativa as boas-vindas com GIF",
  commands: [
    "welcome5",
    "bemvindo5",
    "boasvinda5",
    "bv5",
  ],
  usage: `${PREFIX}welcome5 (1/0)`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid }) => {
    if (!args.length) {
      throw new InvalidParameterError(
        "Você precisa digitar 1 ou 0!\n\n" +
        `${PREFIX}welcome5 1 - Ativar\n` +
        `${PREFIX}welcome5 0 - Desativar`
      );
    }

    const welcome = args[0] == "1";
    const notWelcome = args[0] == "0";

    if (!welcome && !notWelcome) {
      throw new InvalidParameterError(
        "Você precisa digitar 1 ou 0!"
      );
    }

    const hasActive = welcome && isActiveWelcome5Group(remoteJid);
    const hasInactive = notWelcome && !isActiveWelcome5Group(remoteJid);

    if (hasActive || hasInactive) {
      throw new WarningError(
        `As boas-vindas já estão ${welcome ? "ativadas" : "desativadas"}!`
      );
    }

    if (welcome) {
      activateWelcome5Group(remoteJid);
    } else {
      deactivateWelcome5Group(remoteJid);
    }

    await sendSuccessReact();

    const gifFile = getGifFileName(remoteJid);
    const customMessage = getCustomWelcome5Message(remoteJid);

    if (welcome) {
      await sendReply(
        `Boas-vindas ativadas!\n\n` +
        `*Configuração atual:*\n` +
        `GIF: ${gifFile ? '✅ Configurado' : '⚠️ Não configurado'}\n` +
        `Mensagem: ${customMessage ? '✅ Personalizada' : '⚠️ Padrão'}\n\n` +
        `${!gifFile ? `Configure o GIF:\n${PREFIX}set-gif-bv5 (responder GIF)\n\n` : ''}` +
        `${!customMessage ? `Personalize a mensagem:\n${PREFIX}legenda-bv5 Sua mensagem` : ''}`
      );
    } else {
      await sendReply(
        `Boas-vindas desativadas!\n\n` +
        `Para reativar:\n${PREFIX}welcome5 1`
      );
    }
  },
};