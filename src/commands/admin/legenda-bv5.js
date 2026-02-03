const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
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

function setCustomWelcome5Message(groupId, message) {
  const data = loadWelcome5Data();
  if (!data[groupId]) {
    data[groupId] = {
      active: false,
      customMessage: message,
      gifFileName: null
    };
  } else {
    data[groupId].customMessage = message;
  }
  saveWelcome5Data(data);
}

function getCustomWelcome5Message(groupId) {
  const data = loadWelcome5Data();
  return data[groupId] ? data[groupId].customMessage : null;
}

function isActiveWelcome5Group(groupId) {
  const data = loadWelcome5Data();
  return data[groupId] && data[groupId].active === true;
}

function getGifFileName(groupId) {
  const data = loadWelcome5Data();
  return data[groupId]?.gifFileName || null;
}

module.exports = {
  name: "legenda-bv5",
  description: "Define a legenda personalizada das boas-vindas",
  commands: [
    "legenda-bv5",
    "legendabv5",
    "msg-bv5",
    "mensagem-bv5",
  ],
  usage: `${PREFIX}legenda-bv5 <mensagem>`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, groupName }) => {
    if (!args.length) {
      const currentMessage = getCustomWelcome5Message(remoteJid);
      const gifFile = getGifFileName(remoteJid);
      const isActive = isActiveWelcome5Group(remoteJid);
      
      if (!currentMessage) {
        await sendReply(
          `*Legenda de Boas-vindas (Welcome5)*\n\n` +
          `❌ Nenhuma legenda configurada\n\n` +
          `*Como configurar:*\n` +
          `${PREFIX}legenda-bv5 Bem-vindo ao {grupo}!\n\n` +
          `*Variáveis disponíveis:*\n` +
          `• {grupo} - Nome do grupo\n` +
          `• {membro} - Menção ao novo membro\n` +
          `• {nome} - Nome do novo membro\n\n` +
          `*Status atual:*\n` +
          `GIF: ${gifFile ? '✅ Configurado' : '❌ Não configurado'}\n` +
          `Sistema: ${isActive ? '✅ Ativo' : '❌ Inativo'}`
        );
        return;
      }

      await sendReply(
        `*Legenda Atual (Welcome5)*\n\n` +
        `"${currentMessage}"\n\n` +
        `*Status:*\n` +
        `GIF: ${gifFile ? '✅ Configurado' : '❌ Não configurado'}\n` +
        `Sistema: ${isActive ? '✅ Ativo' : '❌ Inativo'}`
      );
      return;
    }

    const customMessage = args.join(' ');

    if (customMessage.length > 500) {
      throw new InvalidParameterError(
        "A mensagem não pode ter mais de 500 caracteres!"
      );
    }

    if (customMessage.length < 5) {
      throw new InvalidParameterError(
        "A mensagem deve ter pelo menos 5 caracteres!"
      );
    }

    setCustomWelcome5Message(remoteJid, customMessage);
    await sendSuccessReact();

    const previewMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Nome do Grupo')
      .replace(/{membro}/g, '@membro')
      .replace(/{nome}/g, 'João');

    const gifFile = getGifFileName(remoteJid);
    const isActive = isActiveWelcome5Group(remoteJid);

    await sendReply(
      `Legenda configurada!\n\n` +
      `*Preview:*\n"${previewMessage}"\n\n` +
      `*Variáveis:*\n` +
      `• {grupo} = Nome do grupo\n` +
      `• {membro} = Menção\n` +
      `• {nome} = Nome\n\n` +
      `${!gifFile ? `⚠️ GIF não configurado!\nUse: ${PREFIX}set-gif-bv5\n\n` : ''}` +
      `${!isActive ? `⚠️ Sistema desativado!\nUse: ${PREFIX}welcome5 1` : '✅ Tudo pronto!'}`
    );
  },
};