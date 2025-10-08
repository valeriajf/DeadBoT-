/**
 * Comando QC - Versão Funcional com FFmpeg
 * Converte PNG para WebP usando FFmpeg
 * 
 * @author Adaptado para DeadBoT
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
      // Verifica se o texto foi fornecido
      if (!fullArgs || fullArgs.trim() === '') {
        return await sendErrorReply('❌ Falta o texto!\n\n💡 Uso correto:\n' + PREFIX + 'qc <seu texto aqui>\n\n📝 Exemplo:\n' + PREFIX + 'qc Olá Mundo!');
      }

      // Envia reação de aguarde
      await sendWaitReact();

      // Obtém a foto de perfil do usuário
      let ppimg = "";
      try {
        ppimg = await socket.profilePictureUrl(userJid, 'image');
      } catch {
        ppimg = 'https://telegra.ph/file/b5427ea4b8701bc47e751.jpg';
      }

      // Obtém o nome do usuário
      const pushname = webMessage.pushName || "Usuário";

      // Monta o JSON para a API
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

      // Faz a requisição para a API
      const res = await axios.post('https://bot.lyo.su/quote/generate', json, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      // Verifica se a resposta foi bem-sucedida
      if (!res.data || !res.data.result || !res.data.result.image) {
        return await sendErrorReply("❌ Erro ao gerar a figurinha!");
      }

      // Converte a imagem base64 para buffer
      const imageBuffer = Buffer.from(res.data.result.image, 'base64');

      if (imageBuffer.length === 0) {
        return await sendErrorReply("❌ A imagem gerada está vazia!");
      }

      // Verifica se FFmpeg está disponível com PATH correto
      let ffmpegAvailable = false;
      let ffmpegPath = '/data/data/com.termux/files/usr/bin/ffmpeg';
      
      try {
        // Define o PATH correto do Termux
        const termuxPath = '/data/data/com.termux/files/usr/bin';
        const currentPath = process.env.PATH || '';
        
        if (!currentPath.includes(termuxPath)) {
          process.env.PATH = `${termuxPath}:${currentPath}`;
          console.log('✅ PATH atualizado:', process.env.PATH);
        }
        
        // Testa o FFmpeg com PATH absoluto
        const testResult = await execPromise(`${ffmpegPath} -version 2>&1`);
        
        if (testResult.stdout && testResult.stdout.includes('ffmpeg version')) {
          ffmpegAvailable = true;
          console.log('✅ FFmpeg encontrado e funcional!');
          console.log('📌 Versão:', testResult.stdout.split('\n')[0]);
        } else {
          throw new Error('FFmpeg não retornou versão válida');
        }
        
      } catch (err) {
        console.log('❌ Erro ao testar FFmpeg:', err.message);
        ffmpegAvailable = false;
      }

      if (ffmpegAvailable) {
        try {
          // Salva PNG temporário
          await writeFile(tempPngPath, imageBuffer);
          console.log('✅ PNG salvo em:', tempPngPath);

          // Converte para WebP usando ffmpeg (comando simplificado)
          const ffmpegCommand = `${ffmpegPath} -y -i "${tempPngPath}" -vcodec libwebp -q:v 75 -preset default -loop 0 -an -vsync 0 "${tempWebpPath}"`;
          
          console.log('🔄 Executando FFmpeg...');
          console.log('📝 Comando:', ffmpegCommand);
          const { stdout, stderr } = await execPromise(ffmpegCommand);
          
          if (stderr) console.log('FFmpeg stderr:', stderr);
          console.log('✅ Conversão concluída!');

          // Verifica se o arquivo WebP foi criado
          if (fs.existsSync(tempWebpPath)) {
            // Lê o arquivo WebP gerado
            const webpBuffer = fs.readFileSync(tempWebpPath);
            console.log('✅ WebP lido, tamanho:', webpBuffer.length, 'bytes');

            // Envia como sticker
            await sendStickerFromBuffer(webpBuffer, true);
            console.log('✅ Sticker enviado!');

            // Limpa arquivos temporários
            await unlink(tempPngPath).catch(() => {});
            await unlink(tempWebpPath).catch(() => {});

          } else {
            throw new Error('Arquivo WebP não foi criado');
          }

        } catch (ffmpegError) {
          console.error('❌ Erro no FFmpeg:', ffmpegError);
          
          // Se ffmpeg falhar, envia como imagem
          await sendImageFromBuffer(
            imageBuffer, 
            `✅ *Quote Gerada!*\n\n📝 *Texto:* ${fullArgs.trim()}\n👤 *Autor:* ${pushname}\n\n⚠️ _Erro ao converter para sticker_\n_Erro: ${ffmpegError.message}_`,
            undefined,
            true
          );

          // Limpa arquivos temporários
          await unlink(tempPngPath).catch(() => {});
          await unlink(tempWebpPath).catch(() => {});
        }
      } else {
        // FFmpeg não disponível, envia como imagem
        console.log('📤 Enviando como imagem...');
        
        await sendImageFromBuffer(
          imageBuffer, 
          `✅ *Quote Gerada!*\n\n📝 *Texto:* ${fullArgs.trim()}\n👤 *Autor:* ${pushname}\n\n💡 _Para enviar como figurinha, instale o FFmpeg:_\n\`\`\`pkg install ffmpeg\`\`\``,
          undefined,
          true
        );
      }
      
      // Envia reação de sucesso
      await sendSuccessReact();

    } catch (e) {
      console.error('❌ Erro geral no comando qc:', e);
      
      // Limpa arquivos temporários em caso de erro
      await unlink(tempPngPath).catch(() => {});
      await unlink(tempWebpPath).catch(() => {});
      
      await sendErrorReply("❌ Erro: " + e.message);
    }
  },
};