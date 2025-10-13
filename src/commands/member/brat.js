/**
 * Comando Brat - Gera sticker com estilo Brat
 * Cria uma figurinha com texto no estilo Brat usando API
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
    sendStickerFromBuffer,
    sendImageFromBuffer
  }) => {
    try {
      // Verifica se o texto foi fornecido
      if (!fullArgs || fullArgs.trim() === '') {
        return await sendErrorReply('❌ Falta o texto!\n\n💡 Uso correto:\n' + PREFIX + 'brat <seu texto aqui>\n\n📝 Exemplo:\n' + PREFIX + 'brat Charli XCX');
      }

      // Envia reação de aguarde
      await sendWaitReact();

      // Monta a URL da API com o texto
      const apiUrl = `https://api.cognima.com.br/api/image/brat?key=CognimaTeamFreeKey&texto=${encodeURIComponent(fullArgs.trim())}`;

      try {
        // Baixa a imagem da API
        const response = await axios.get(apiUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
          validateStatus: function (status) {
            return status >= 200 && status < 300;
          }
        });

        // Converte para buffer
        const imageBuffer = Buffer.from(response.data);

        // Verifica se o buffer não está vazio
        if (imageBuffer.length === 0) {
          throw new Error('Imagem vazia retornada pela API');
        }

        // Envia como sticker
        await sendStickerFromBuffer(imageBuffer, true);

        // Envia reação de sucesso
        await sendSuccessReact();

      } catch (apiError) {
        // Se a API falhar, informa o usuário
        if (apiError.response && apiError.response.status === 500) {
          return await sendErrorReply('❌ A API está temporariamente indisponível.\n\n');
        }

        throw apiError;
      }

    } catch (e) {
      console.error('Erro no comando brat:', e.message);
      await sendErrorReply("❌ Erro ao gerar o sticker Brat.\n\n💡 Verifique se o texto está correto e tente novamente!");
    }
  },
};