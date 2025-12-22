const { PREFIX } = require(`${BASE_DIR}/config`);
const { WarningError } = require(`${BASE_DIR}/errors`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "twitter",
  description: "Faço o download de vídeos e imagens do Twitter/X!",
  commands: ["twitter", "tt", "x"],
  usage: `${PREFIX}twitter https://x.com/user/status/123456`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    sendVideoFromURL,
    sendImageFromURL,
    sendText,
    fullArgs,
    sendWaitReact,
    sendSuccessReact,
    sendErrorReply,
  }) => {
    if (!fullArgs || !fullArgs.trim()) {
      throw new InvalidParameterError(
        "Você precisa enviar uma URL do Twitter!\n\n" +
        `Exemplo: ${PREFIX}twitter https://x.com/user/status/123456`
      );
    }

    const url = fullArgs.trim();

    // Valida o formato da URL do Twitter/X
    const twitterUrlRegex = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/[0-9]+/;
    
    if (!twitterUrlRegex.test(url)) {
      throw new WarningError(
        "URL inválida! Forneça uma URL válida do Twitter/X.\n\n" +
        "Formatos aceitos:\n" +
        "• https://twitter.com/user/status/123456\n" +
        "• https://x.com/user/status/123456"
      );
    }

    await sendWaitReact();

    try {
      const apiUrl = `https://corex-brasil.onrender.com/api/twitter?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      if (!responseText.trim()) {
        throw new Error("Servidor retornou resposta vazia");
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Resposta inválida do servidor: ${parseError.message}`);
      }

      if (!data.success) {
        throw new Error("Erro do servidor: " + (data.data || "Erro desconhecido"));
      }

      // Verifica se há erro na resposta
      if (typeof data.data === 'string') {
        if (data.data.includes('401')) {
          throw new Error("Acesso negado. O tweet pode estar privado ou deletado.");
        } else if (data.data.includes('Request Failed')) {
          throw new Error("Falha na requisição: " + data.data);
        } else {
          throw new Error("Erro: " + data.data);
        }
      }

      if (!data.data || !data.data.url) {
        throw new Error("Nenhuma mídia encontrada neste tweet");
      }

      await sendSuccessReact();

      const mediaUrls = data.data.url;
      
      // Verifica se é um array de vídeos (com diferentes qualidades)
      if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
        // Tenta encontrar vídeo em HD, se não encontrar usa SD
        const hdVideo = mediaUrls.find(item => item.hd);
        const sdVideo = mediaUrls.find(item => item.sd);
        const videoUrl = hdVideo ? hdVideo.hd : (sdVideo ? sdVideo.sd : mediaUrls[0]);
        
        if (typeof videoUrl === 'string') {
          await sendVideoFromURL(
            videoUrl,
            `🎬 *Vídeo do Twitter*\n💚 by *DeadBoT*`
          );
        } else {
          throw new Error("URL de vídeo inválida");
        }
      } else {
        // Se não for array de vídeos, é uma imagem
        await sendImageFromURL(
          typeof mediaUrls === 'string' ? mediaUrls : mediaUrls[0],
          `🖼️ *Imagem do Twitter*
           💚 by *DeadBoT*`
        );
      }

    } catch (error) {
      console.error("Erro no Twitter downloader:", error);

      let errorMessage = "Falha ao processar o link do Twitter.";
      
      if (error.message.includes("fetch") || error.message.includes("HTTP")) {
        errorMessage += "\n\n🌐 Problema de conexão. Tente novamente em alguns minutos.";
      } else if (error.message.includes("privado") || error.message.includes("401")) {
        errorMessage += "\n\n🔒 O tweet pode estar privado, protegido ou deletado.";
      } else if (error.message.includes("servidor")) {
        errorMessage += "\n\n⚠️ Problema no servidor da API. Aguarde alguns minutos.";
      } else {
        errorMessage += `\n\n❌ ${error.message}`;
      }

      errorMessage += "\n\n💡 Dicas:\n";
      errorMessage += "• Verifique se o tweet é público\n";
      errorMessage += "• Confirme se a URL está completa\n";
      errorMessage += "• Certifique-se de que o tweet não foi deletado";

      await sendErrorReply(errorMessage);
    }
  },
};