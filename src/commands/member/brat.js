/**
 * Comando Brat - Gera sticker com estilo Brat
 * Cria uma figurinha com texto no estilo Brat usando Jimp + FFmpeg
 * 
 * @author Dev VaL 
 */
const fs = require("node:fs");
const path = require("path");
const { exec } = require("node:child_process");
const { PREFIX, BOT_NAME, BOT_EMOJI, TEMP_DIR } = require(`${BASE_DIR}/config`);
const { getRandomName } = require(`${BASE_DIR}/utils`);
const { addStickerMetadata } = require(`${BASE_DIR}/services/sticker`);
const Jimp = require('jimp');

module.exports = {
  name: "brat",
  description: "Cria uma figurinha com texto no estilo Brat",
  commands: ["brat"],
  usage: `${PREFIX}brat <texto>`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    fullArgs, 
    sendErrorReply,
    sendWaitReact,
    sendSuccessReact,
    sendStickerFromFile,
    webMessage,
    userJid
  }) => {
    try {
      if (!fullArgs || fullArgs.trim() === '') {
        return await sendErrorReply('❌ Falta o texto!\n\n💡 Uso correto:\n' + PREFIX + 'brat <seu texto aqui>\n\n📝 Exemplo:\n' + PREFIX + 'brat Charli XCX');
      }

      await sendWaitReact();

      // Remove emojis do texto (Jimp não suporta emojis)
      let text = fullArgs.trim().toLowerCase();
      
      // Remove emojis usando regex
      text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
      text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Símbolos e pictogramas
      text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transporte e símbolos de mapa
      text = text.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Bandeiras
      text = text.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Símbolos diversos
      text = text.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
      text = text.replace(/[\u{FE00}-\u{FE0F}]/gu, ''); // Variações de seleção
      text = text.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Símbolos e pictogramas suplementares
      text = text.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); // Símbolos e pictogramas estendidos
      
      // Remove espaços extras que podem ter sobrado
      text = text.trim().replace(/\s+/g, ' ');
      
      if (!text || text === '') {
        return await sendErrorReply('❌ O texto não pode conter apenas emojis!\n\n💡 Use: ' + PREFIX + 'brat <texto>\n\n⚠️ Nota: Emojis serão removidos automaticamente.');
      }

      const width = 512;
      const height = 512;
      
      // Cria imagem com callback
      const image = await new Promise((resolve, reject) => {
        new Jimp(width, height, 0x8ACE00FF, (err, img) => {
          if (err) reject(err);
          else resolve(img);
        });
      });
      
      // Escolhe fonte baseada no tamanho do texto
      let font;
      const textLength = text.length;
      
      if (textLength > 20) {
        font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
      } else if (textLength > 12) {
        font = await Jimp.loadFont(Jimp.FONT_SANS_128_BLACK);
      } else {
        font = await Jimp.loadFont(Jimp.FONT_SANS_128_BLACK);
      }
      
      // Calcula posição para múltiplas linhas se necessário
      const maxWidth = width - 60;
      const words = text.split(' ');
      const lines = [];
      
      // Simula quebra de linha (ajustado para fonte menor)
      let currentLine = '';
      const charWidth = textLength > 20 ? 35 : textLength > 12 ? 65 : 65;
      
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (testLine.length * charWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      // Calcula altura total e posição inicial
      const lineHeight = textLength > 20 ? 75 : textLength > 12 ? 130 : 130;
      const totalHeight = lines.length * lineHeight;
      let startY = (height - totalHeight) / 2;
      
      // Desenha cada linha
      for (const line of lines) {
        const textWidth = Jimp.measureText(font, line);
        const x = (width - textWidth) / 2;
        
        image.print(font, x, startY, line);
        startY += lineHeight;
      }
      
      // Salva PNG temporário
      const inputPath = path.resolve(TEMP_DIR, getRandomName("png"));
      await image.writeAsync(inputPath);
      
      // Converte PNG para WebP usando FFmpeg (mesmo método do sticker.js)
      const outputTempPath = path.resolve(TEMP_DIR, getRandomName("webp"));
      
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
      
      // Remove arquivo PNG temporário
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }

      if (!fs.existsSync(outputTempPath)) {
        throw new Error("Arquivo de saída não foi criado pelo FFmpeg");
      }

      // Adiciona metadados ao sticker
      const username = webMessage.pushName || webMessage.notifyName || userJid.replace(/@s.whatsapp.net/, "");
      
      const metadata = {
        username: username,
        botName: `${BOT_EMOJI} ${BOT_NAME}`,
      };

      const stickerPath = await addStickerMetadata(
        await fs.promises.readFile(outputTempPath),
        metadata
      );

      await sendSuccessReact();

      // Envia o sticker
      await sendStickerFromFile(stickerPath, true);

      // Limpeza de arquivos temporários
      if (fs.existsSync(outputTempPath)) {
        fs.unlinkSync(outputTempPath);
      }

      if (fs.existsSync(stickerPath)) {
        fs.unlinkSync(stickerPath);
      }

    } catch (e) {
      console.error('Erro no comando brat:', e.message);
      console.error('Stack:', e.stack);
      await sendErrorReply("❌ Erro ao gerar o sticker Brat.\n\n💡 " + e.message);
    }
  },
};