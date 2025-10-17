const { PREFIX } = require(`${BASE_DIR}/config`);
const { WarningError } = require(`${BASE_DIR}/errors`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "insta",
  description: "Faço o download de imagens, vídeos e reels do Instagram!",
  commands: ["insta", "instagram", "ig"],
  usage: `${PREFIX}insta https://www.instagram.com/reel/abc123/`,
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
        "Você precisa enviar uma URL do Instagram!\n\n" +
        `Exemplo: ${PREFIX}insta https://www.instagram.com/reel/abc123/`
      );
    }

    const url = fullArgs.trim();

    // Valida o formato da URL do Instagram
    const instagramUrlRegex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|stories)\/[A-Za-z0-9_-]+/;
    
    if (!instagramUrlRegex.test(url)) {
      throw new WarningError(
        "URL inválida! Forneça uma URL válida do Instagram.\n\n" +
        "Formatos aceitos:\n" +
        "• Posts: instagram.com/p/abc123/\n" +
        "• Reels: instagram.com/reel/abc123/\n" +
        "• Stories: instagram.com/stories/user/abc123/"
      );
    }

    await sendWaitReact();

    try {
      const apiUrl = `https://corex-brasil.onrender.com/api/instagram?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Referer': 'https://www.instagram.com/',
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
          throw new Error("Acesso negado. O post pode ser privado ou a API está temporariamente indisponível.");
        } else if (data.data.includes('Request Failed')) {
          throw new Error("Falha na requisição: " + data.data);
        } else {
          throw new Error("Erro: " + data.data);
        }
      }

      if (!Array.isArray(data.data) || data.data.length === 0) {
        throw new Error("Nenhuma mídia encontrada neste post");
      }

      await sendSuccessReact();

      const mediaItem = data.data[0];
      
      // Detecta se é vídeo
      const isVideo = mediaItem.url && (
        mediaItem.url.includes('.mp4') || 
        (mediaItem.thumbnail && mediaItem.url !== mediaItem.thumbnail)
      );

      if (isVideo) {
        await sendVideoFromURL(
          mediaItem.url,
          `📼 *Vídeo do Instagram*`
        );
      } else {
        await sendImageFromURL(
          mediaItem.url,
          `🖼️ *Imagem do Instagram*`
        );
      }

      // Avisa se houver mais mídias no post (carrossel)
      if (data.data.length > 1) {
        await sendText(
          `📋 Este post possui ${data.data.length} mídias. Apenas a primeira foi enviada.`
        );
      }

    } catch (error) {
      console.error("Erro no Instagram downloader:", error);

      let errorMessage = "Falha ao processar o link do Instagram.";
      
      if (error.message.includes("fetch") || error.message.includes("HTTP")) {
        errorMessage += "\n\n🌐 Problema de conexão. Tente novamente em alguns minutos.";
      } else if (error.message.includes("privado") || error.message.includes("401")) {
        errorMessage += "\n\n🔒 O post pode estar privado ou restrito.";
      } else if (error.message.includes("servidor")) {
        errorMessage += "\n\n⚠️ Problema no servidor da API. Aguarde alguns minutos.";
      } else {
        errorMessage += `\n\n❌ ${error.message}`;
      }

      errorMessage += "\n\n💡 Dicas:\n";
      errorMessage += "• Verifique se o post é público\n";
      errorMessage += "• Confirme se a URL está completa\n";
      errorMessage += "• Tente um link diferente";

      await sendErrorReply(errorMessage);
    }
  },
};