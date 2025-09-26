const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração do welcome2
const WELCOME2_DB_PATH = path.join(`${BASE_DIR}`, 'database', 'welcome2.json');

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
    const dbDir = path.dirname(WELCOME2_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(WELCOME2_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar welcome2.json:', error);
  }
}

function setCustomWelcomeMessage(groupId, message) {
  const data = loadWelcome2Data();
  if (!data[groupId]) {
    data[groupId] = {
      active: false,
      customMessage: message
    };
  } else {
    data[groupId].customMessage = message;
  }
  saveWelcome2Data(data);
}

function getCustomWelcomeMessage(groupId) {
  const data = loadWelcome2Data();
  return data[groupId] ? data[groupId].customMessage : null;
}

function isActiveWelcome2Group(groupId) {
  const data = loadWelcome2Data();
  return data[groupId] && data[groupId].active === true;
}

module.exports = {
  name: "legenda-bv",
  description: "Define uma legenda personalizada para as boas-vindas do welcome2.",
  commands: [
    "legenda-bv",
    "legendabv",
    "legenda-boasvindas",
    "legenda-welcome",
    "setlegenda",
    "caption-welcome",
  ],
  usage: `${PREFIX}legenda-bv <sua mensagem personalizada>`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, groupName }) => {
    if (!args.length) {
      // Se não tem argumentos, mostra a legenda atual
      const currentMessage = getCustomWelcomeMessage(remoteJid);
      const isActive = isActiveWelcome2Group(remoteJid);
      
      if (!currentMessage) {
        await sendReply(
          `📝 *Legenda de Boas-vindas*\n\n` +
          `❌ Nenhuma legenda personalizada definida para este grupo.\n\n` +
          `💡 *Como usar:*\n` +
          `${PREFIX}legenda-bv Bem-vindo ao {grupo}! Olá {membro}, seja bem-vindo!\n\n` +
          `📋 *Variáveis disponíveis:*\n` +
          `• {grupo} - Nome do grupo\n` +
          `• {membro} - Menção do membro\n\n` +
          `Status do Welcome2: ${isActive ? '✅ Ativo' : '❌ Inativo'}`
        );
        return;
      }

      await sendReply(
        `📝 *Legenda Atual de Boas-vindas*\n\n` +
        `"${currentMessage}"\n\n` +
        `Status do Welcome2: ${isActive ? '✅ Ativo' : '❌ Inativo'}\n\n` +
        `💡 Para alterar, use: ${PREFIX}legenda-bv <nova mensagem>`
      );
      return;
    }

    const customMessage = args.join(' ');

    // Validações básicas
    if (customMessage.length > 500) {
      throw new InvalidParameterError(
        "A mensagem personalizada não pode ter mais de 500 caracteres!"
      );
    }

    if (customMessage.length < 10) {
      throw new InvalidParameterError(
        "A mensagem personalizada deve ter pelo menos 10 caracteres!"
      );
    }

    // Salva a mensagem personalizada
    setCustomWelcomeMessage(remoteJid, customMessage);

    await sendSuccessReact();

    // Mostra preview da mensagem
    const previewMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Nome do Grupo')
      .replace(/{membro}/g, '@membro');

    await sendReply(
      `✅ *Legenda personalizada definida com sucesso!*\n\n` +
      `📋 *Preview da mensagem:*\n` +
      `"${previewMessage}"\n\n` +
      `📝 *Variáveis usadas:*\n` +
      `• {grupo} = Nome do grupo\n` +
      `• {membro} = Menção do novo membro\n\n` +
      `💡 *Dica:* ${!isActiveWelcome2Group(remoteJid) ? 
        `Use \`${PREFIX}welcome2 1\` para ativar as boas-vindas personalizadas!` : 
        'As boas-vindas personalizadas já estão ativas!'}`
    );
  },
};