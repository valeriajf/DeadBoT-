/**
 * Comando QC - Versão Final Limpa
 * Cria figurinhas com texto em formato quote
 * 
 * @author Dev VaL 
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
    const tempDir = '/data/data/com.termux/files/usr/tmp';
    const tempPngPath = path.join(tempDir, `qc_${Date.now()}.png`);
    const tempWebpPath = path.join(tempDir, `qc_${Date.now()}.webp`);

    try {
      if (!fullArgs || fullArgs.trim() === '') {
        return await sendErrorReply('❌ Falta o texto!\n\n💡 Uso correto:\n' + PREFIX + 'qc <seu texto aqui>\n\n📝 Exemplo:\n' + PREFIX + 'qc Olá Mundo!');
      }

      await sendWaitReact();

      let ppimg = "";
      try {
        ppimg = await socket.profilePictureUrl(userJid, 'image');
      } catch {
        ppimg = 'https://telegra.ph/file/b5427ea4b8701bc47e751.jpg';
      }

      const pushname = webMessage.pushName || "Usuário";

      const json = {
        "type": "quote",
        "format": "png",
        "backgroundColor": "#FFFFFF",
        "width": 512,
        "height": 768,
        "scale": 2,
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

      let ffmpegAvailable = false;
      const ffmpegPath = '/data/data/com.termux/files/usr/bin/ffmpeg';
      
      try {
        const termuxPath = '/data/data/com.termux/files/usr/bin';
        const currentPath = process.env.PATH || '';
        
        if (!currentPath.includes(termuxPath)) {
          process.env.PATH = `${termuxPath}:${currentPath}`;
        }
        
        const testResult = await execPromise(`${ffmpegPath} -version 2>&1`);
        
        if (testResult.stdout && testResult.stdout.includes('ffmpeg version')) {
          ffmpegAvailable = true;
        }
      } catch {
        ffmpegAvailable = false;
      }

      if (ffmpegAvailable) {
        try {
          await writeFile(tempPngPath, imageBuffer);

          const ffmpegCommand = `cd /data/data/com.termux/files/usr/bin && ./ffmpeg -y -i "${tempPngPath}" -vcodec libwebp -q:v 75 -preset default -loop 0 -an -vsync 0 "${tempWebpPath}" 2>&1`;
          
          await execPromise(ffmpegCommand, {
            env: {
              ...process.env,
              PATH: '/data/data/com.termux/files/usr/bin:' + process.env.PATH,
              LD_LIBRARY_PATH: '/data/data/com.termux/files/usr/lib'
            }
          });

          if (fs.existsSync(tempWebpPath)) {
            const webpBuffer = fs.readFileSync(tempWebpPath);
            await sendStickerFromBuffer(webpBuffer, true);
            
            await unlink(tempPngPath).catch(() => {});
            await unlink(tempWebpPath).catch(() => {});
          } else {
            throw new Error('Arquivo WebP não foi criado');
          }

        } catch {
          await sendImageFromBuffer(
            imageBuffer, 
            `✅ *Quote Gerada!*\n\n📝 *Texto:* ${fullArgs.trim()}\n👤 *Autor:* ${pushname}`,
            undefined,
            true
          );

          await unlink(tempPngPath).catch(() => {});
          await unlink(tempWebpPath).catch(() => {});
        }
      } else {
        await sendImageFromBuffer(
          imageBuffer, 
          `✅ *Quote Gerada!*\n\n📝 *Texto:* ${fullArgs.trim()}\n👤 *Autor:* ${pushname}`,
          undefined,
          true
        );
      }
      
      await sendSuccessReact();

    } catch (e) {
      await unlink(tempPngPath).catch(() => {});
      await unlink(tempWebpPath).catch(() => {});
      
      await sendErrorReply("❌ Erro ao gerar a figurinha. Tente novamente!");
    }
  },
};