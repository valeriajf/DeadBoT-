const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { download, getContent } = require(`${BASE_DIR}/utils`);
const fs = require('fs');
const path = require('path');

const WELCOME5_DB_PATH = path.join(`${BASE_DIR}`, 'database', 'welcome5.json');
// ✅ CORRIGIDO: salva na pasta assets/videos/ em vez de assets/images/
const WELCOME5_VIDEOS_DIR = path.join(ASSETS_DIR, 'videos');

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

function setGifFile(groupId, fileName) {
  const data = loadWelcome5Data();
  if (!data[groupId]) {
    data[groupId] = {
      active: false,
      customMessage: null,
      gifFileName: fileName
    };
  } else {
    data[groupId].gifFileName = fileName;
  }
  saveWelcome5Data(data);
}

function isActiveWelcome5Group(groupId) {
  const data = loadWelcome5Data();
  return data[groupId] && data[groupId].active === true;
}

module.exports = {
  name: "set-gif-bv5",
  description: "Define o GIF para as boas-vindas (welcome5)",
  commands: [
    "set-gif-bv5",
    "setgifbv5",
    "gif-bv5",
    "definir-gif-bv5",
  ],
  usage: `${PREFIX}set-gif-bv5 (responda a um GIF)`,
  handle: async ({ 
    isVideo,
    isImage,
    isReply,
    sendSuccessReply,
    sendErrorReply,
    sendSuccessReact,
    remoteJid,
    webMessage,
  }) => {
    
    if (!isReply || (!isVideo && !isImage)) {
      throw new InvalidParameterError(
        `Você precisa responder a um GIF!\n\n` +
        `💡 *Como usar:*\n` +
        `1. Envie um GIF no grupo\n` +
        `2. Responda ao GIF com: ${PREFIX}set-gif-bv5`
      );
    }

    try {
      const videoContent = getContent(webMessage, 'video');
      const imageContent = getContent(webMessage, 'image');
      
      if (!videoContent && !imageContent) {
        throw new InvalidParameterError('Mídia não encontrada na mensagem citada!');
      }

      // ✅ CORRIGIDO: garante que a pasta videos existe
      if (!fs.existsSync(WELCOME5_VIDEOS_DIR)) {
        fs.mkdirSync(WELCOME5_VIDEOS_DIR, { recursive: true });
      }
      
      const groupIdClean = remoteJid.replace('@g.us', '').substring(0, 15);
      const timestamp = Date.now();
      const extension = isVideo ? 'mp4' : 'gif';
      const tempFileName = `welcome5-temp-${timestamp}`;
      const fileName = `welcome5-${groupIdClean}-${timestamp}.${extension}`;
      // ✅ CORRIGIDO: salva em assets/videos/
      const fullPath = path.join(WELCOME5_VIDEOS_DIR, fileName);

      const tempPath = await download(
        webMessage, 
        tempFileName, 
        isVideo ? 'video' : 'image',
        extension
      );
      
      if (!tempPath || !fs.existsSync(tempPath)) {
        throw new Error('Falha ao baixar o GIF');
      }

      // Remove GIF antigo se existir
      const data = loadWelcome5Data();
      if (data[remoteJid]?.gifFileName) {
        const oldPath = path.join(WELCOME5_VIDEOS_DIR, data[remoteJid].gifFileName);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // ✅ CORRIGIDO: usa copyFileSync + unlinkSync para evitar erro cross-partition
      fs.copyFileSync(tempPath, fullPath);
      fs.unlinkSync(tempPath);

      setGifFile(remoteJid, fileName);
      await sendSuccessReact();

      const fileSize = (fs.statSync(fullPath).size / 1024 / 1024).toFixed(2);

      await sendSuccessReply(
        `✅ *GIF configurado!*\n\n` +
        `📁 Arquivo: ${fileName}\n` +
        `💾 Tamanho: ${fileSize} MB\n\n` +
        `📝 *Próximos passos:*\n` +
        `• Configure a legenda: ${PREFIX}legenda-bv5 Bem-vindo {nome}!\n` +
        `• Ative o sistema: ${PREFIX}welcome5 1\n\n` +
        `Status: ${isActiveWelcome5Group(remoteJid) ? '✅ Ativo' : '❌ Inativo'}`
      );

    } catch (error) {
      console.error('[SET-GIF-BV5] Erro:', error);
      await sendErrorReply(
        `Erro ao processar o GIF!\n\n` +
        `${error.message}\n\n` +
        `Tente novamente com outro GIF.`
      );
    }
  },
};
