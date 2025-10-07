const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração do welcome3
const WELCOME3_DB_PATH = path.join(`${BASE_DIR}`, 'database', 'welcome3.json');

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
    const dbDir = path.dirname(WELCOME3_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(WELCOME3_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar welcome3.json:', error);
  }
}

function setCustomWelcome3Message(groupId, message) {
  const data = loadWelcome3Data();
  if (!data[groupId]) {
    data[groupId] = {
      active: false,
      customMessage: message
    };
  } else {
    data[groupId].customMessage = message;
  }
  saveWelcome3Data(data);
}

function getCustomWelcome3Message(groupId) {
  const data = loadWelcome3Data();
  return data[groupId] ? data[groupId].customMessage : null;
}

function isActiveWelcome3Group(groupId) {
  const data = loadWelcome3Data();
  return data[groupId] && data[groupId].active === true;
}

module.exports = {
  name: "legenda-bv3",
  description: "Define uma legenda personalizada para as boas-vindas do welcome3 (com foto do grupo).",
  commands: [
    "legenda-bv3",
    "legendabv3",
    "legenda-boasvindas3",
    "legenda-welcome3",
    "setlegenda3",
    "caption-welcome3",
  ],
  usage: `${PREFIX}legenda-bv3 <sua mensagem personalizada>`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, groupName }) => {
    if (!args.length) {
      // Se não tem argumentos, mostra a legenda atual
      const currentMessage = getCustomWelcome3Message(remoteJid);
      const isActive = isActiveWelcome3Group(remoteJid);
      
      if (!currentMessage) {
        await sendReply(
          `📝 *Legenda de Boas-vindas (Welcome3)*\n\n` +
          `❌ Nenhuma legenda personalizada definida para este grupo.\n\n` +
          `💡 *Como usar:*\n` +
          `${PREFIX}legenda-bv3 Bem-vindo ao {grupo}! Olá {membro}, seja bem-vindo!\n\n` +
          `📋 *Variáveis disponíveis:*\n` +
          `• {grupo} - Nome do grupo\n` +
          `• {membro} - Menção do membro\n\n` +
          `ℹ️ *Diferença:* Welcome3 usa a foto do grupo, não do membro!\n\n` +
          `Status do Welcome3: ${isActive ? '✅ Ativo' : '❌ Inativo'}`
        );
        return;
      }

      await sendReply(
        `📝 *Legenda Atual de Boas-vindas (Welcome3)*\n\n` +
        `"${currentMessage}"\n\n` +
        `Status do Welcome3: ${isActive ? '✅ Ativo' : '❌ Inativo'}\n\n` +
        `💡 Para alterar, use: ${PREFIX}legenda-bv3 <nova mensagem>`
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
    setCustomWelcome3Message(remoteJid, customMessage);

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
      `📸 *Imagem:* Será usada a foto do grupo\n\n` +
      `💡 *Dica:* ${!isActiveWelcome3Group(remoteJid) ? 
        `Use \`${PREFIX}welcome3 1\` para ativar as boas-vindas com foto do grupo!` : 
        'As boas-vindas com foto do grupo já estão ativas!'}`
    );
  },
};