const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração do welcome4
const WELCOME4_DB_PATH = path.join(`${BASE_DIR}`, 'database', 'welcome4.json');

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
    const dbDir = path.dirname(WELCOME4_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(WELCOME4_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar welcome4.json:', error);
  }
}

function setCustomWelcome4Message(groupId, message) {
  const data = loadWelcome4Data();
  if (!data[groupId]) {
    data[groupId] = {
      active: false,
      customMessage: message
    };
  } else {
    data[groupId].customMessage = message;
  }
  saveWelcome4Data(data);
}

function getCustomWelcome4Message(groupId) {
  const data = loadWelcome4Data();
  return data[groupId] ? data[groupId].customMessage : null;
}

function isActiveWelcome4Group(groupId) {
  const data = loadWelcome4Data();
  return data[groupId] && data[groupId].active === true;
}

module.exports = {
  name: "legenda-bv4",
  description: "Define uma legenda personalizada para as boas-vindas do welcome4 (apenas texto).",
  commands: [
    "legenda-bv4",
    "legendabv4",
    "legenda-boasvindas4",
    "legenda-welcome4",
    "setlegenda4",
    "caption-welcome4",
  ],
  usage: `${PREFIX}legenda-bv4 <sua mensagem personalizada>`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, groupName }) => {
    if (!args.length) {
      // Se não tem argumentos, mostra a legenda atual
      const currentMessage = getCustomWelcome4Message(remoteJid);
      const isActive = isActiveWelcome4Group(remoteJid);
      
      if (!currentMessage) {
        await sendReply(
          `📝 *Legenda de Boas-vindas (Welcome4)*\n\n` +
          `❌ Nenhuma legenda personalizada definida para este grupo.\n\n` +
          `💡 *Como usar:*\n` +
          `${PREFIX}legenda-bv4 Bem-vindo ao {grupo}! Olá {nome}, seja bem-vindo!\n\n` +
          `📋 *Variáveis disponíveis:*\n` +
          `• {grupo} - Nome do grupo\n` +
          `• {membro} - Menção do membro (@numero)\n` +
          `• {nome} - Nome do membro\n\n` +
          `ℹ️ *Diferença:* Welcome4 não usa foto, apenas texto!\n\n` +
          `Status do Welcome4: ${isActive ? '✅ Ativo' : '❌ Inativo'}`
        );
        return;
      }

      await sendReply(
        `📝 *Legenda Atual de Boas-vindas (Welcome4)*\n\n` +
        `"${currentMessage}"\n\n` +
        `Status do Welcome4: ${isActive ? '✅ Ativo' : '❌ Inativo'}\n\n` +
        `💡 Para alterar, use: ${PREFIX}legenda-bv4 <nova mensagem>`
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
    setCustomWelcome4Message(remoteJid, customMessage);

    await sendSuccessReact();

    // Mostra preview da mensagem
    const previewMessage = customMessage
      .replace(/{grupo}/g, groupName || 'Nome do Grupo')
      .replace(/{membro}/g, '@membro')
      .replace(/{nome}/g, 'João');

    await sendReply(
      `✅ *Legenda personalizada definida com sucesso!*\n\n` +
      `📋 *Preview da mensagem:*\n` +
      `"${previewMessage}"\n\n` +
      `📝 *Variáveis usadas:*\n` +
      `• {grupo} = Nome do grupo\n` +
      `• {membro} = Menção do novo membro\n` +
      `• {nome} = Nome do novo membro\n\n` +
      `📸 *Imagem:* Não será enviada foto (apenas texto)\n\n` +
      `💡 *Dica:* ${!isActiveWelcome4Group(remoteJid) ? 
        `Use \`${PREFIX}welcome4 1\` para ativar as boas-vindas apenas com texto!` : 
        'As boas-vindas apenas com texto já estão ativas!'}`
    );
  },
};