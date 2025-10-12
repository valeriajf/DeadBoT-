/**
 * Comando Brat - Gera sticker com estilo Brat
 * Usa API própria do Brat (sem depender da Spider API)
 * 
 * @author Dev VaL 
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const axios = require('axios');

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
    sendStickerFromBuffer
  }) => {
    try {
      if (!fullArgs || fullArgs.trim() === '') {
        return await sendErrorReply('❌ Falta o texto!\n\n💡 Uso correto:\n' + PREFIX + 'brat <seu texto aqui>\n\n📝 Exemplo:\n' + PREFIX + 'brat Charli XCX');
      }

      await sendWaitReact();

      const texto = fullArgs.trim();

      // APIs do Brat para tentar
      const apis = [
        `https://brat.caliphdev.com/api/brat?text=${encodeURIComponent(texto)}`,
        `https://api.popcat.xyz/brat?text=${encodeURIComponent(texto)}`,
        `https://api.ryzendesu.vip/api/maker/brat?text=${encodeURIComponent(texto)}`
      ];

      let imageBuffer = null;

      for (const apiUrl of apis) {
        try {
          const response = await axios.get(apiUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            validateStatus: (status) => status >= 200 && status < 300
          });

          const buffer = Buffer.from(response.data);

          if (buffer.length > 100) {
            imageBuffer = buffer;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!imageBuffer) {
        return await sendErrorReply(
          '❌ Não foi possível gerar a imagem Brat!\n\n' +
          '💡 Todas as APIs estão temporariamente indisponíveis.\n' +
          '⏰ Tente novamente em alguns minutos!'
        );
      }

      await sendStickerFromBuffer(imageBuffer, true);
      await sendSuccessReact();

    } catch (e) {
      console.error('Erro no comando brat:', e.message);
      await sendErrorReply("❌ Erro ao gerar o sticker Brat.\n\n💡 Tente novamente!");
    }
  },
};