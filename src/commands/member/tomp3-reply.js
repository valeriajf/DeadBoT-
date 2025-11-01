/**
 * Converte vídeos para áudio MP3
 * Versão específica para MARCAR vídeos
 *
 * @author Adaptado para DeadBoT
 */

const { PREFIX, TEMP_DIR } = require(`${BASE_DIR}/config`);
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const { getRandomNumber } = require(`${BASE_DIR}/utils`);
const { downloadContentFromMessage } = require("baileys");

module.exports = {
  name: "tomp3-reply",
  description: "Converte vídeos marcados para áudio MP3!",
  commands: ["tomp3-reply", "tomp3r", "video2mp3-reply"],
  usage: `${PREFIX}tomp3-reply (marque um vídeo)`,
  
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    isReply,
    webMessage,
    sendWaitReact,
    sendSuccessReact,
    sendErrorReply,
    sendSuccessReply,
    sendAudioFromFile,
  }) => {
    try {
      if (!isReply) {
        throw new InvalidParameterError(
          "❌ Você precisa marcar um vídeo para usar este comando!\n\n" +
          `*Como usar:*\n` +
          `1️⃣ Marque/responda uma mensagem de vídeo\n` +
          `2️⃣ Digite: ${PREFIX}tomp3-reply\n\n` +
          `💡 *Dica:* Para enviar vídeo com legenda, use ${PREFIX}tomp3`
        );
      }

      await sendWaitReact();
      await sendSuccessReply("🎵 Convertendo vídeo marcado para áudio MP3...");

      const inputPath = await downloadQuotedVideo(webMessage);

      if (!inputPath || !fs.existsSync(inputPath)) {
        throw new WarningError("❌ Não foi possível baixar o vídeo marcado. Tente novamente.");
      }

      const videoStats = fs.statSync(inputPath);
      const videoSizeMB = (videoStats.size / 1024 / 1024).toFixed(2);

      const outputPath = path.resolve(
        TEMP_DIR,
        `audio_${getRandomNumber(10_000, 99_999)}.mp3`
      );

      await convertVideoToMp3(inputPath, outputPath);

      if (!fs.existsSync(outputPath)) {
        throw new WarningError("❌ Falha na conversão do áudio.");
      }

      const audioStats = fs.statSync(outputPath);
      const audioSizeMB = (audioStats.size / 1024 / 1024).toFixed(2);

      await sendSuccessReact();
      await sendAudioFromFile(outputPath);

      await sendSuccessReply(
        `✅ *Áudio extraído com sucesso!*\n\n` +
        `📊 *Tamanho:* ${audioSizeMB} MB\n` +
        `🎵 *Formato:* MP3 192kbps\n` +
        `💚 *by DeadBoT*`
      );

      cleanupFile(inputPath);
      cleanupFile(outputPath);

    } catch (error) {
      if (error instanceof InvalidParameterError || error instanceof WarningError) {
        throw error;
      }
      
      await sendErrorReply(
        `❌ Erro ao converter o vídeo: ${error.message}\n\n` +
        `💡 Verifique se o FFmpeg está instalado no servidor.`
      );
    }
  },
};

/**
 * Baixa vídeo da mensagem marcada (reply)
 * Busca em múltiplos lugares na estrutura da mensagem
 * @param {Object} webMessage - Mensagem do WhatsApp
 * @returns {Promise<string>} Caminho do arquivo baixado
 */
async function downloadQuotedVideo(webMessage) {
  let videoMessage = null;

  // Busca 1: contextInfo.quotedMessage.videoMessage (padrão)
  if (webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage) {
    videoMessage = webMessage.message.extendedTextMessage.contextInfo.quotedMessage.videoMessage;
  }
  
  // Busca 2: contextInfo.quotedMessage.viewOnceMessage.message.videoMessage
  else if (webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.viewOnceMessage?.message?.videoMessage) {
    videoMessage = webMessage.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessage.message.videoMessage;
  }
  
  // Busca 3: contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage
  else if (webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.viewOnceMessageV2?.message?.videoMessage) {
    videoMessage = webMessage.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessageV2.message.videoMessage;
  }
  
  // Busca 4: Busca recursiva em toda a estrutura (último recurso)
  else {
    videoMessage = findVideoMessageRecursive(webMessage);
  }

  if (!videoMessage) {
    throw new WarningError(
      "❌ Vídeo marcado não encontrado!\n\n" +
      `💡 *Certifique-se de:*\n` +
      `• Marcar/responder uma mensagem que contém vídeo\n` +
      `• O vídeo não seja muito antigo\n` +
      `• O vídeo ainda esteja disponível no servidor`
    );
  }

  const stream = await downloadContentFromMessage(videoMessage, "video");

  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  if (buffer.length === 0) {
    throw new Error("Buffer de vídeo vazio");
  }

  const filePath = path.resolve(
    TEMP_DIR,
    `video_quoted_${getRandomNumber(10_000, 99_999)}.mp4`
  );

  fs.writeFileSync(filePath, buffer);
  
  return filePath;
}

/**
 * Busca videoMessage recursivamente em toda a estrutura da mensagem
 * @param {Object} obj - Objeto para buscar
 * @param {number} maxDepth - Profundidade máxima
 * @param {number} currentDepth - Profundidade atual
 * @returns {Object|null} videoMessage se encontrado
 */
function findVideoMessageRecursive(obj, maxDepth = 6, currentDepth = 0) {
  if (!obj || typeof obj !== 'object' || currentDepth > maxDepth) {
    return null;
  }
  
  // Se o objeto atual tem as propriedades de um videoMessage, retorna
  if (obj.url && obj.mimetype && obj.fileSha256 && obj.mediaKey) {
    return obj;
  }
  
  // Busca recursivamente em todos os valores do objeto
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object') {
      // Prioriza buscar em keys que contenham 'video'
      if (key.toLowerCase().includes('video')) {
        const result = findVideoMessageRecursive(value, maxDepth, currentDepth + 1);
        if (result) return result;
      }
    }
  }
  
  // Segunda passagem: busca em todas as outras keys
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      const result = findVideoMessageRecursive(value, maxDepth, currentDepth + 1);
      if (result) return result;
    }
  }
  
  return null;
}

/**
 * Converte vídeo para MP3 usando FFmpeg
 * @param {string} inputPath - Caminho do vídeo de entrada
 * @param {string} outputPath - Caminho do áudio de saída
 * @returns {Promise<void>}
 */
function convertVideoToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -ab 192k -ar 44100 -y "${outputPath}"`;

    exec(ffmpegCommand, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error("Falha ao converter o vídeo. Verifique se o FFmpeg está instalado."));
      }

      resolve();
    });
  });
}

/**
 * Remove arquivo de forma segura
 * @param {string} filePath - Caminho do arquivo
 */
function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Erro ao remover arquivo:`, error.message);
  }
}