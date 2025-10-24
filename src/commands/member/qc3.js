/**
 * Comando QC - Versão para Host Linux (BoresHost)
 * Cria figurinhas com texto em formato quote
 * 
 * @author RiqueFla (adaptado)
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const axios = require('axios');
const { writeFile, unlink } = require('fs/promises');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const execPromise = promisify(exec);

module.exports = {
  name: "qc",
  description: "Cria uma figurinha com seu texto em formato de quote/citação",
  commands: ["qc", "quote", "stickertxt"],
  usage: `${PREFIX}qc <texto>`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    fullArgs, 
    sendErrorReply, 
    sendWaitReact,
    sendSuccessReact,
    sendStickerFromBuffer,
    sendImageFromBuffer,
    socket,
    userJid,
    webMessage
  }) => {
    // Diretório temporário para Linux
    const tempDir = '/tmp';
    const tempPngPath = path.join(tempDir, `qc_${Date.now()}.png`);
    const tempWebpPath = path.join(tempDir, `qc_${Date.now()}.webp`);

    try {
      if (!fullArgs || fullArgs.trim() === '') {
        return await sendErrorReply('❌ Falta o texto!\n\n💡 Uso correto:\n' + PREFIX + 'qc <seu texto aqui>\n\n📝 Exemplo:\n' + PREFIX + 'qc Olá Mundo!');
      }

      await sendWaitReact();

      // Pega foto de perfil
      let ppimg = "";
      try {
        ppimg = await socket.profilePictureUrl(userJid, 'image');
      } catch {
        ppimg = 'https://telegra.ph/file/b5427ea4b8701bc47e751.jpg';
      }

      const pushname = webMessage.pushName || "Usuário";

      // Monta JSON para API
      const json = {
        "type": "quote",
        "format": "png",
        "backgroundColor": "#FFFFFF",
        "width": 400,
        "height": 400,
        "scale": 1,
        "messages": [{
          "entities": [],
          "avatar": true,
          "from": {
            "id": 1,
            "name": pushname,
            "photo": {
              "url": ppimg
            }
          },
          "text": fullArgs.trim(),
          "replyMessage": {}
        }]
      };

      // Chama API para gerar imagem
      const res = await axios.post('https://bot.lyo.su/quote/generate', json, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (!res.data || !res.data.result || !res.data.result.image) {
        return await sendErrorReply("❌ Erro ao gerar a figurinha!");
      }

      const imageBuffer = Buffer.from(res.data.result.image, 'base64');

      if (imageBuffer.length === 0) {
        return await sendErrorReply("❌ A imagem gerada está vazia!");
      }

      // Verifica se ffmpeg está disponível no sistema
      let ffmpegAvailable = false;
      
      try {
        // Testa ffmpeg no PATH do sistema
        const testResult = await execPromise('ffmpeg -version');
        
        if (testResult.stdout && testResult.stdout.includes('ffmpeg version')) {
          ffmpegAvailable = true;
          console.log('[QC] FFmpeg encontrado!');
        }
      } catch (error) {
        console.log('[QC] FFmpeg não encontrado:', error.message);
        ffmpegAvailable = false;
      }

      // Se ffmpeg disponível, converte para WebP
      if (ffmpegAvailable) {
        try {
          // Salva PNG temporário
          await writeFile(tempPngPath, imageBuffer);

          // Converte PNG para WebP
          const ffmpegCommand = `ffmpeg -y -i "${tempPngPath}" -vcodec libwebp -q:v 75 -preset default -loop 0 -an -vsync 0 "${tempWebpPath}"`;
          
          await execPromise(ffmpegCommand);

          // Verifica se WebP foi criado
          if (fs.existsSync(tempWebpPath)) {
            const webpBuffer = fs.readFileSync(tempWebpPath);
            
            // Envia como figurinha
            await sendStickerFromBuffer(webpBuffer, true);
            
            // Limpa arquivos temporários
            await unlink(tempPngPath).catch(() => {});
            await unlink(tempWebpPath).catch(() => {});
            
            console.log('[QC] Figurinha enviada com sucesso!');
          } else {
            throw new Error('WebP não foi criado');
          }

        } catch (conversionError) {
          console.error('[QC] Erro na conversão:', conversionError.message);
          
          // Se falhou, envia como imagem
          await sendImageFromBuffer(
            imageBuffer, 
            `✅ *Quote Gerada!*\n\n📝 *Texto:* ${fullArgs.trim()}\n👤 *Autor:* ${pushname}\n\n⚠️ FFmpeg não disponível - enviado como imagem`,
            undefined,
            true
          );

          // Limpa arquivos temporários
          await unlink(tempPngPath).catch(() => {});
          await unlink(tempWebpPath).catch(() => {});
        }
      } else {
        // FFmpeg não disponível - envia como imagem
        await sendImageFromBuffer(
          imageBuffer, 
          `✅ *Quote Gerada!*\n\n📝 *Texto:* ${fullArgs.trim()}\n👤 *Autor:* ${pushname}\n\n⚠️ FFmpeg não instalado - enviado como imagem\n\n💡 Para enviar como sticker, instale ffmpeg:\nsudo apt install ffmpeg`,
          undefined,
          true
        );
        
        console.log('[QC] FFmpeg não disponível, enviado como imagem');
      }
      
      await sendSuccessReact();

    } catch (e) {
      console.error('[QC] Erro geral:', e);
      
      // Limpa arquivos temporários
      await unlink(tempPngPath).catch(() => {});
      await unlink(tempWebpPath).catch(() => {});
      
      await sendErrorReply("❌ Erro ao gerar a figurinha. Tente novamente!");
    }
  },
};