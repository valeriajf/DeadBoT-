/**
 * Comando para criar figurinhas de imagem, gif ou vídeo
 * Adaptado para o formato DeadBoT
 * 
 *
 * @author VaL 
 */
const fs = require("node:fs");
const path = require("node:path");
const { exec } = require("node:child_process");

const { getRandomName, baileysIs, download, getContent } = require(`${BASE_DIR}/utils`);
const { addStickerMetadata } = require(`${BASE_DIR}/services/sticker`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX, BOT_NAME, BOT_EMOJI, TEMP_DIR } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "sticker",
  description: "Cria figurinhas de imagem, gif ou vídeo (máximo 9.9 segundos).",
  commands: ["f", "s", "sticker", "fig"],
  usage: `${PREFIX}sticker (marque ou responda uma imagem/gif/vídeo)`,
  handle: async ({
    webMessage,
    sendErrorReply,
    sendWaitReact,
    sendSuccessReact,
    sendStickerFromFile,
    userJid,
  }) => {
    // Usa baileysIs para verificar se tem imagem ou vídeo (suporta quoted e viewOnce)
    const isImage = baileysIs(webMessage, "image");
    const isVideo = baileysIs(webMessage, "video");

    if (!isImage && !isVideo) {
      throw new InvalidParameterError(
        `Você precisa marcar ou responder a uma imagem/gif/vídeo!\n\n` +
        `Use: ${PREFIX}sticker (marcando ou respondendo uma mídia)`
      );
    }

    // Verifica se a mídia tem mediaKey (necessária para download)
    const content = isVideo ? getContent(webMessage, "video") : getContent(webMessage, "image");
    
    if (!content?.mediaKey) {
      return sendErrorReply(
        `❌ *Não é possível baixar esta mídia!*\n\n` +
        `⚠️ *Motivo:*\n` +
        `Esta é uma mensagem de *visualização única* que já foi vista ou a chave de criptografia não está disponível.\n\n` +
        `💡 *Solução:*\n` +
        `• Peça para enviarem a mídia novamente como *mídia normal* (não visualização única)\n` +
        `• Ou envie você mesmo a mídia diretamente para criar a figurinha\n\n` +
        `ℹ️ *Nota:* Por questões de segurança do WhatsApp, mídias de visualização única não podem ser baixadas após serem vistas.`
      );
    }

    await sendWaitReact();

    const username =
      webMessage.pushName ||
      webMessage.notifyName ||
      userJid.replace(/@s.whatsapp.net/, "");

    const metadata = {
      username: username,
      botName: `${BOT_EMOJI} ${BOT_NAME}`,
    };

    const outputTempPath = path.resolve(TEMP_DIR, getRandomName("webp"));
    let inputPath = null;

    try {
      if (isVideo) {
        // Verifica a duração do vídeo
        const seconds = content?.seconds;

        if (seconds && seconds > 9.9) {
          return sendErrorReply(
            `⚠️ O vídeo tem *${seconds} segundos*!\n\n` +
            `O vídeo precisa ter no máximo *9.9 segundos* para ser convertido em figurinha.`
          );
        }

        // Download do vídeo usando a função download direta
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            inputPath = await download(webMessage, getRandomName(), "video", "mp4");
            
            if (!inputPath) {
              throw new Error("Download retornou null");
            }
            
            break;
          } catch (downloadError) {
            console.error(
              `Tentativa ${attempt} de download de vídeo falhou:`,
              downloadError.message
            );

            if (attempt === 3) {
              throw new Error(
                `Falha ao baixar vídeo após 3 tentativas: ${downloadError.message}`
              );
            }

            await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
          }
        }

        // Converte vídeo para sticker animado (mantém proporções com fundo transparente)
        await new Promise((resolve, reject) => {
          const cmd = `ffmpeg -y -i "${inputPath}" -vf "scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15,format=yuva420p" -c:v libwebp -lossless 0 -compression_level 6 -q:v 50 -loop 0 -preset default -an -vsync 0 -t 8 "${outputTempPath}"`;

          exec(cmd, (error, _, stderr) => {
            if (error) {
              console.error("FFmpeg error:", stderr);
              reject(error);
            } else {
              resolve();
            }
          });
        });
      } else {
        // Download da imagem usando a função download direta
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            inputPath = await download(webMessage, getRandomName(), "image", "jpg");
            
            if (!inputPath) {
              throw new Error("Download retornou null");
            }
            
            break;
          } catch (downloadError) {
            console.error(
              `Tentativa ${attempt} de download de imagem falhou:`,
              downloadError.message
            );

            if (attempt === 3) {
              throw new Error(
                `Falha ao baixar imagem após 3 tentativas: ${downloadError.message}`
              );
            }

            await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
          }
        }

        // Converte imagem para sticker (mantém proporções com fundo transparente)
        await new Promise((resolve, reject) => {
          const cmd = `ffmpeg -i "${inputPath}" -vf "scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=yuva420p" -c:v libwebp -lossless 0 -compression_level 6 -q:v 75 -preset default "${outputTempPath}"`;

          exec(cmd, (error, _, stderr) => {
            if (error) {
              console.error("FFmpeg error:", stderr);
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }

      // Remove arquivo de input
      if (inputPath && fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
        inputPath = null;
      }

      if (!fs.existsSync(outputTempPath)) {
        throw new Error("Arquivo de saída não foi criado pelo FFmpeg");
      }

      // Adiciona metadados ao sticker
      const stickerPath = await addStickerMetadata(
        await fs.promises.readFile(outputTempPath),
        metadata
      );

      await sendSuccessReact();

      // Envia o sticker com retry
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await sendStickerFromFile(stickerPath, true);
          break;
        } catch (stickerError) {
          console.error(
            `Tentativa ${attempt} de envio de sticker falhou:`,
            stickerError.message
          );

          if (attempt === 3) {
            throw new Error(
              `Falha ao enviar figurinha após 3 tentativas: ${stickerError.message}`
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }

      // Limpeza de arquivos temporários
      if (fs.existsSync(outputTempPath)) {
        fs.unlinkSync(outputTempPath);
      }

      if (fs.existsSync(stickerPath)) {
        fs.unlinkSync(stickerPath);
      }
    } catch (error) {
      console.error("Erro detalhado no comando sticker:", error);

      // Limpeza em caso de erro
      if (inputPath && fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
      if (fs.existsSync(outputTempPath)) {
        fs.unlinkSync(outputTempPath);
      }

      if (
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("AggregateError") ||
        error.message.includes("getaddrinfo ENOTFOUND") ||
        error.message.includes("connect ECONNREFUSED") ||
        error.message.includes("mmg.whatsapp.net")
      ) {
        throw new Error(
          `⚠️ Erro de conexão ao baixar mídia do WhatsApp. Tente novamente em alguns segundos.`
        );
      }

      if (error.message.includes("FFmpeg")) {
        throw new Error(
          `⚠️ Erro ao processar mídia com FFmpeg. Verifique se o arquivo não está corrompido.`
        );
      }

      throw new Error(`⚠️ Erro! Tente novamente... ⚠️`);
    }
  },
};