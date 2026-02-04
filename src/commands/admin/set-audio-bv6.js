const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { download, getContent } = require(`${BASE_DIR}/utils`);
const fs = require('fs');
const path = require('path');

const WELCOME6_DB_PATH = path.join(`${BASE_DIR}`, 'database', 'welcome6.json');
const WELCOME6_AUDIOS_DIR = path.join(ASSETS_DIR, 'audios');

// Garante que o diretório existe
if (!fs.existsSync(WELCOME6_AUDIOS_DIR)) {
  fs.mkdirSync(WELCOME6_AUDIOS_DIR, { recursive: true });
}

function loadWelcome6Data() {
  try {
    if (fs.existsSync(WELCOME6_DB_PATH)) {
      const data = fs.readFileSync(WELCOME6_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Erro ao carregar welcome6.json:', error);
    return {};
  }
}

function saveWelcome6Data(data) {
  try {
    const dbDir = path.dirname(WELCOME6_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(WELCOME6_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar welcome6.json:', error);
  }
}

function setAudioFile(groupId, fileName) {
  const data = loadWelcome6Data();
  if (!data[groupId]) {
    data[groupId] = {
      active: false,
      customMessage: null,
      audioFileName: fileName
    };
  } else {
    data[groupId].audioFileName = fileName;
  }
  saveWelcome6Data(data);
}

function isActiveWelcome6Group(groupId) {
  const data = loadWelcome6Data();
  return data[groupId] && data[groupId].active === true;
}

module.exports = {
  name: "set-audio-bv6",
  description: "Define o áudio das boas-vindas respondendo a um áudio",
  commands: [
    "set-audio-bv6",
    "setaudio6",
    "audio-bv6",
    "definir-audio-bv6",
  ],
  usage: `${PREFIX}set-audio-bv6 (responda a um áudio)`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    isAudio,
    isReply,
    sendSuccessReply,
    sendErrorReply,
    sendSuccessReact,
    remoteJid,
    webMessage,
  }) => {
    
    if (!isReply || !isAudio) {
      throw new InvalidParameterError(
        `Você precisa responder a um áudio!\n\n` +
        `💡 *Como usar:*\n` +
        `1. Envie um áudio no grupo\n` +
        `2. Responda ao áudio com:\n` +
        `${PREFIX}set-audio-bv6`
      );
    }

    try {
      // Define nome do arquivo
      const groupIdClean = remoteJid.replace('@g.us', '').substring(0, 15);
      const timestamp = Date.now();
      const tempFileName = `welcome6-temp-${timestamp}`;
      const fileName = `welcome6-${groupIdClean}-${timestamp}.mp3`;
      const fullPath = path.join(WELCOME6_AUDIOS_DIR, fileName);

      // Download do áudio
      const tempPath = await download(
        webMessage, 
        tempFileName, 
        'audio',
        'mp3'
      );
      
      if (!tempPath || !fs.existsSync(tempPath)) {
        throw new Error('Falha ao baixar o áudio');
      }

      // Remove áudio antigo se existir
      const data = loadWelcome6Data();
      if (data[remoteJid]?.audioFileName) {
        const oldPath = path.join(WELCOME6_AUDIOS_DIR, data[remoteJid].audioFileName);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Move para pasta final
      fs.renameSync(tempPath, fullPath);

      // Salva no database
      setAudioFile(remoteJid, fileName);
      await sendSuccessReact();

      const fileSize = (fs.statSync(fullPath).size / 1024 / 1024).toFixed(2);
      const isActive = isActiveWelcome6Group(remoteJid);

      await sendSuccessReply(
        `Áudio das boas-vindas configurado!\n\n` +
        `📁 Arquivo: ${fileName}\n` +
        `💾 Tamanho: ${fileSize} MB\n\n` +
        `${!isActive ? `⚠️ O welcome6 está *desativado*!\n\n` : ''}` +
        `*Próximos passos:*\n` +
        `${!isActive ? `1. Ative: ${PREFIX}welcome6 1\n` : ''}` +
        `${!isActive ? `2` : `1`}. Configure a mensagem (opcional): ${PREFIX}legenda-bv6\n` +
        `${!isActive ? `3` : `2`}. Teste adicionando um membro`
      );

    } catch (error) {
      console.error('[SET-AUDIO-BV6] Erro:', error.message);
      
      await sendErrorReply(
        `Erro ao processar o áudio!\n\n` +
        `${error.message}\n\n` +
        `Certifique-se de responder a um áudio válido.`
      );
    }
  },
};