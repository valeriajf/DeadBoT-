/**
 * Baixa vídeos e imagens do Pinterest usando API do KlickPin.
 * Sistema gratuito e funcional para vídeos.
 * 
 * @author VaL
 */

const axios = require("axios");
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "pinterest",
  description: "Baixa vídeos e imagens do Pinterest em alta qualidade.",
  commands: ["pinterest", "pin"],
  usage: `${PREFIX}pinterest <link do pin>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    fullArgs,
    sendErrorReply,
    sendVideoFromURL,
    sendImageFromURL,
    sendReact,
  }) => {
    try {
      if (!fullArgs || !fullArgs.trim()) {
        await sendErrorReply(
          `Uso incorreto!\n\nExemplo:\n${PREFIX}pinterest https://pin.it/... ou\n${PREFIX}pinterest https://www.pinterest.com/pin/...`
        );
        return;
      }

      const url = fullArgs.trim();

      if (!url.match(/pinterest\.com|pin\.it/i)) {
        await sendErrorReply("❌ Isso não parece um link do Pinterest.");
        return;
      }

      await sendReact("⏳");

      // MÉTODO 1: API do KlickPin
      try {
        const klickpinResponse = await axios.post(
          "https://klickpin.com/api/download",
          { url: url },
          {
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Origin": "https://klickpin.com",
              "Referer": "https://klickpin.com/pt/",
            },
            timeout: 45000,
          }
        );

        if (klickpinResponse.data) {
          const data = klickpinResponse.data;
          let mediaUrl = null;
          let mediaType = null;

          if (data.success && data.data) {
            mediaUrl = data.data.video_url || data.data.video || data.data.image_url || data.data.image;
            mediaType = data.data.video_url || data.data.video ? "video" : "image";
          } else if (data.video || data.image) {
            mediaUrl = data.video || data.image;
            mediaType = data.video ? "video" : "image";
          } else if (data.url) {
            mediaUrl = data.url;
            mediaType = data.type || (data.url.includes(".mp4") ? "video" : "image");
          } else if (Array.isArray(data) && data.length > 0) {
            mediaUrl = data[0].url || data[0];
            mediaType = data[0].type || (String(mediaUrl).includes(".mp4") ? "video" : "image");
          }

          if (mediaUrl) {
            if (mediaType === "video") {
              await sendVideoFromURL(
                mediaUrl,
                "📌 *Vídeo do Pinterest*\n\n💚 by DeadBoT",
                [],
                true
              );
            } else {
              await sendImageFromURL(
                mediaUrl,
                "📌 *Imagem do Pinterest*\n\n💚 by DeadBoT"
              );
            }

            await sendReact("✅");
            return;
          }
        }
      } catch {}

      // MÉTODO 2: Scraping direto
      let resolvedUrl = url;
      try {
        const res = await axios.get(url, {
          timeout: 20000,
          maxRedirects: 10,
          headers: { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
        });
        const possible = res?.request?.res?.responseUrl;
        if (possible && typeof possible === "string") {
          resolvedUrl = possible;
        }
      } catch {}

      const response = await axios.get(resolvedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 30000,
      });

      const html = response.data;

      // Busca vídeos
      const videoPatterns = [
        /"V_720P":\{"url":"([^"]+)"/gi,
        /"video_url":"([^"]+\.mp4[^"]*)"/gi,
        /"url":"(https:\/\/[^"]*\.pinimg\.com[^"]*\.mp4[^"]*)"/gi,
      ];

      const foundVideos = new Set();

      videoPatterns.forEach((pattern) => {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            let cleanUrl = match[1]
              .replace(/\\\//g, "/")
              .replace(/\\u002F/g, "/")
              .replace(/&amp;/g, "&")
              .replace(/\\/g, "");
            
            if (cleanUrl.startsWith("http") && cleanUrl.includes(".mp4")) {
              foundVideos.add(cleanUrl);
            }
          }
        }
      });

      // Busca imagens
      const imagePatterns = [
        /"images":\{[^}]*"orig":\{"url":"([^"]+)"/gi,
        /"url":"(https:\/\/[^"]*pinimg\.com[^"]*\/originals\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi,
        /"url":"(https:\/\/[^"]*pinimg\.com[^"]*\/736x\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi,
      ];

      const foundImages = new Set();

      imagePatterns.forEach((pattern) => {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            let cleanUrl = match[1]
              .replace(/\\\//g, "/")
              .replace(/&amp;/g, "&")
              .replace(/\\/g, "");
            
            if (cleanUrl.startsWith("http") && cleanUrl.includes("pinimg.com")) {
              foundImages.add(cleanUrl);
            }
          }
        }
      });

      const videoUrls = Array.from(foundVideos);
      const imageUrls = Array.from(foundImages);

      let mediaUrl = null;
      let mediaType = null;

      if (videoUrls.length > 0) {
        mediaUrl = videoUrls[0];
        mediaType = "video";
      } else if (imageUrls.length > 0) {
        const originalsImages = imageUrls.filter(u => u.includes("/originals/"));
        mediaUrl = originalsImages.length > 0 ? originalsImages[0] : imageUrls[0];
        mediaType = "image";
      }

      if (!mediaUrl) {
        await sendReact("❌");
        await sendErrorReply(
          "⚠️ Não consegui encontrar mídia neste pin.\n\n" +
          "Possíveis causas:\n" +
          "• O pin é privado ou foi deletado\n" +
          "• O link está inválido\n\n" +
          "Tente novamente mais tarde."
        );
        return;
      }

      if (mediaType === "video") {
        await sendVideoFromURL(
          mediaUrl,
          "📌 *Vídeo do Pinterest*\n\n💚 by DeadBoT",
          [],
          true
        );
      } else {
        await sendImageFromURL(
          mediaUrl,
          "📌 *Imagem do Pinterest*\n\n💚 by DeadBoT"
        );
      }

      await sendReact("✅");
      
    } catch (err) {
      console.error("[PINTEREST] Erro:", err.message || err);
      await sendReact("❌");
      await sendErrorReply(
        "🚫 Ocorreu um erro ao baixar do Pinterest.\n\n" +
        "Tente novamente em alguns instantes."
      );
    }
  },
};