/**
 * Converte vídeos para áudio MP3
 * Extrai o áudio de vídeos enviados com legenda
 *
 * @author Adaptado para DeadBoT
 */

const { PREFIX, TEMP_DIR } = require(`${BASE_DIR}/config`);
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const { getRandomNumber, getContent } = require(`${BASE_DIR}/utils`);
const { downloadContentFromMessage } = require("baileys");

module.exports = {
  name: "tomp3",
  description: "Converte vídeos para áudio MP3!",
  commands: ["tomp3", "video2mp3", "mp3"],
  usage: `${PREFIX}tomp3 (envie um vídeo com esta legenda)`,
  
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    isVideo,
    webMessage,
    sendWaitReact,
    sendSuccessReact,
    sendErrorReply,
    sendSuccessReply,
    sendAudioFromFile,
  }) => {
    try {
      if (!isVideo) {
        throw new InvalidParameterError(
          "❌ Você precisa enviar um vídeo com esta legenda!\n\n" +
          `*Como usar:*\n` +
          `📹 Envie um vídeo\n` +
          `📝 Na legenda, coloque: ${PREFIX}tomp3\n\n` +
          `💡 *Dica:* O comando funciona apenas com vídeos enviados diretamente, não com vídeos marcados.`
        );
      }

      await sendWaitReact();
      await sendSuccessReply("🎵 Convertendo vídeo para áudio MP3...");

      const inputPath = await downloadVideoCustom(webMessage);

      if (!inputPath || !fs.existsSync(inputPath)) {
        throw new WarningError("❌ Não foi possível baixar o vídeo. Tente novamente.");
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
 * Baixa vídeo da mensagem usando getContent do DeadBoT
 * @param {Object} webMessage - Mensagem do WhatsApp
 * @returns {Promise<string>} Caminho do arquivo baixado
 */
async function downloadVideoCustom(webMessage) {
  const videoContent = getContent(webMessage, "video");
  
  if (!videoContent) {
    throw new WarningError(
      "❌ Erro ao processar o vídeo!\n\n" +
      `💡 *Solução:*\n` +
      `• Certifique-se de enviar o vídeo COM a legenda ${PREFIX}tomp3\n` +
      `• Não envie o comando separado do vídeo\n` +
      `• O vídeo e o comando devem estar na mesma mensagem`
    );
  }

  const stream = await downloadContentFromMessage(videoContent, "video");

  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  if (buffer.length === 0) {
    throw new Error("Buffer de vídeo vazio");
  }

  const filePath = path.resolve(
    TEMP_DIR,
    `video_input_${getRandomNumber(10_000, 99_999)}.mp4`
  );

  fs.writeFileSync(filePath, buffer);
  
  return filePath;
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