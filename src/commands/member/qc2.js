/**
 * Comando QC2 - Quote falsificado
 * Formato: #qc2 Nome / Texto
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
  name: "qc2",
  description: "Cria figurinha quote falsificado",
  commands: ["qc2", "fqc"],
  usage: `${PREFIX}qc2 <nome> / <texto>`,
  handle: async ({ 
    fullArgs,
    isReply,
    replyJid,
    sendErrorReply,
    sendWarningReply, 
    sendWaitReact,
    sendSuccessReact,
    sendStickerFromBuffer,
    sendImageFromBuffer,
    socket,
    webMessage,
    remoteJid,
    isGroup
  }) => {
    const tempDir = '/data/data/com.termux/files/usr/tmp';
    const tempPngPath = path.join(tempDir, `qc2_${Date.now()}.png`);
    const tempWebpPath = path.join(tempDir, `qc2_${Date.now()}.webp`);

    function extractUserId(jid) {
      if (!jid) return null;
      if (jid.includes('@lid')) return jid.split('@')[0];
      if (jid.includes('@s.whatsapp.net')) return jid.split('@')[0];
      return jid;
    }

    try {
      if (!isReply) {
        return await sendErrorReply(
          '❌ Responda a mensagem de alguém!\n\n' +
          '💡 Uso: ' + PREFIX + 'qc2 <nome> / <texto>\n\n' +
          '📝 Exemplo:\n' +
          PREFIX + 'qc2 Giancarlo / Olá Mundo'
        );
      }

      if (!fullArgs || fullArgs.trim() === '' || !fullArgs.includes('/')) {
        return await sendErrorReply(
          '❌ Formato incorreto!\n\n' +
          '💡 Uso: ' + PREFIX + 'qc2 <nome> / <texto>\n\n' +
          '📝 Exemplo:\n' +
          PREFIX + 'qc2 João / Olá Mundo'
        );
      }

      const parts = fullArgs.split('/');
      const targetUserName = parts[0].trim();
      const texto = parts[1].trim();

      if (!targetUserName || !texto) {
        return await sendErrorReply(
          '❌ Nome ou texto vazio!\n\n' +
          '💡 Formato: ' + PREFIX + 'qc2 <nome> / <texto>'
        );
      }

      if (texto.length > 30) {
        return await sendWarningReply(
          `⚠️ Texto muito longo!\n\n` +
          `📊 Seu texto: ${texto.length} caracteres\n` +
          `📏 Máximo: 30 caracteres`
        );
      }

      await sendWaitReact();

      const randomColors = ['#FFFFFF', '#000000'];
      const backgroundColor = randomColors[Math.floor(Math.random() * randomColors.length)];

      let targetJid = replyJid;
      let targetUserId = extractUserId(replyJid);
      let targetUserPhoto = 'https://telegra.ph/file/b5427ea4b8701bc47e751.jpg';

      try {
        const quotedMessage = webMessage.message?.extendedTextMessage?.contextInfo;
        
        if (quotedMessage && quotedMessage.participant) {
          targetJid = quotedMessage.participant;
          targetUserId = extractUserId(targetJid);

          if (isGroup) {
            try {
              const groupMetadata = await socket.groupMetadata(remoteJid);
              const participant = groupMetadata.participants.find(p => 
                p.id === targetJid || extractUserId(p.id) === targetUserId
              );
              
              if (participant && participant.jid) {
                targetJid = participant.jid;
                targetUserId = extractUserId(participant.jid);
              }
            } catch (err) {
              console.log('Erro ao buscar metadados:', err.message);
            }
          }
        }

        try {
          targetUserPhoto = await socket.profilePictureUrl(targetJid, 'image');
        } catch {
          targetUserPhoto = 'https://telegra.ph/file/b5427ea4b8701bc47e751.jpg';
        }

      } catch (error) {
        console.log('Erro ao obter dados:', error.message);
      }

      const json = {
        "type": "quote",
        "format": "png",
        "backgroundColor": backgroundColor,
        "width": 512,
        "height": 768,
        "scale": 2,
        "messages": [{
          "entities": [],
          "avatar": true,
          "from": {
            "id": 1,
            "name": targetUserName,
            "photo": { "url": targetUserPhoto }
          },
          "text": texto,
          "replyMessage": {}
        }]
      };

      const res = await axios.post('https://btzqc.betabotz.eu.org/generate', json, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (!res.data?.result?.image) {
        return await sendErrorReply("❌ Erro ao gerar a figurinha!");
      }

      const imageBuffer = Buffer.from(res.data.result.image, 'base64');

      let ffmpegAvailable = false;
      const ffmpegPath = '/data/data/com.termux/files/usr/bin/ffmpeg';
      
      try {
        const testResult = await execPromise(`${ffmpegPath} -version 2>&1`);
        if (testResult.stdout?.includes('ffmpeg version')) {
          ffmpegAvailable = true;
        }
      } catch {}

      if (ffmpegAvailable) {
        try {
          await writeFile(tempPngPath, imageBuffer);
          await execPromise(
            `cd /data/data/com.termux/files/usr/bin && ./ffmpeg -y -i "${tempPngPath}" -vcodec libwebp -q:v 75 -preset default -loop 0 -an -vsync 0 "${tempWebpPath}" 2>&1`,
            {
              env: {
                ...process.env,
                PATH: '/data/data/com.termux/files/usr/bin:' + process.env.PATH,
                LD_LIBRARY_PATH: '/data/data/com.termux/files/usr/lib'
              }
            }
          );

          if (fs.existsSync(tempWebpPath)) {
            const webpBuffer = fs.readFileSync(tempWebpPath);
            await sendStickerFromBuffer(webpBuffer, true);
            await unlink(tempPngPath).catch(() => {});
            await unlink(tempWebpPath).catch(() => {});
          } else {
            throw new Error('WebP não criado');
          }
        } catch {
          await sendImageFromBuffer(imageBuffer, `✅ Quote!\n👤 ${targetUserName}\n📝 ${texto}`, undefined, true);
          await unlink(tempPngPath).catch(() => {});
          await unlink(tempWebpPath).catch(() => {});
        }
      } else {
        await sendImageFromBuffer(imageBuffer, `✅ Quote!\n👤 ${targetUserName}\n📝 ${texto}`, undefined, true);
      }
      
      await sendSuccessReact();

    } catch (e) {
      await unlink(tempPngPath).catch(() => {});
      await unlink(tempWebpPath).catch(() => {});
      console.error('Erro no qc2:', e.message);
      await sendErrorReply("❌ Erro ao gerar a figurinha!");
    }
  },
};