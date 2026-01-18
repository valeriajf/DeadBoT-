/**
 * Baixa vídeos do Facebook via scraping direto do HTML.
 * Não depende de APIs externas.
 *
 * @author VaL
 */

const axios = require("axios");
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "facebook",
  description: "Baixa vídeos do Facebook em HD/SD.",
  commands: ["facebook", "fb", "face"],
  usage: `${PREFIX}facebook <link do vídeo>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    fullArgs,
    sendErrorReply,
    sendVideoFromURL,
    sendReact,
  }) => {
    try {
      if (!fullArgs || !fullArgs.trim()) {
        await sendErrorReply(
          `Uso incorreto!\n\nExemplo:\n${PREFIX}facebook https://www.facebook.com/...`
        );
        return;
      }

      const url = fullArgs.trim();

      if (!url.match(/facebook\.com|fb\.watch|fb\.me/i)) {
        await sendErrorReply("❌ Isso não parece um link do Facebook.");
        return;
      }

      await sendReact("⏳");

      let resolvedUrl = url;
      try {
        const res = await axios.get(url, {
          timeout: 20000,
          maxRedirects: 10,
          headers: { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
        });
        const possible = res?.request?.res?.responseUrl;
        if (possible && typeof possible === "string") {
          resolvedUrl = possible;
        }
      } catch {
        // Ignora erro ao resolver URL
      }

      const response = await axios.get(resolvedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Upgrade-Insecure-Requests": "1",
        },
        timeout: 30000,
        maxRedirects: 5,
      });

      const html = response.data;
      let videoUrl = null;

      const videoPatterns = [
        /"playable_url(?:_quality_hd)?":"(https?:[^"]*\.mp4[^"]*)"/gi,
        /"browser_native_(?:hd|sd)_url":"(https?:[^"]*\.mp4[^"]*)"/gi,
        /"download_url":"(https?:[^"]*\.mp4[^"]*)"/gi,
        /"src":"(https?:[^"]*\.mp4[^"]*)"/gi,
        /"representation[^}]*"base_url":"(https?:[^"]*\.mp4[^"]*)"/gi,
        new RegExp('"(?:video_url|playable_url)":"(https?://[^"]*\\.mp4[^"]*)"', 'gi'),
      ];

      const foundUrls = new Set();

      videoPatterns.forEach((pattern) => {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            let cleanUrl = match[1]
              .replace(/\\\//g, "/")
              .replace(/\\u002F/g, "/")
              .replace(/&amp;/g, "&")
              .replace(/\\/g, "");
            
            if (
              (cleanUrl.includes("fbcdn.net") || 
               cleanUrl.includes("facebook.com") ||
               cleanUrl.includes("video.xx.fbcdn.net")) &&
              cleanUrl.includes(".mp4")
            ) {
              foundUrls.add(cleanUrl);
            }
          }
        }
      });

      const videoUrls = Array.from(foundUrls);

      const hdUrls = videoUrls.filter(u => 
        u.includes("_hd") || 
        u.includes("quality_hd") || 
        u.includes("browser_native_hd")
      );
      
      const sdUrls = videoUrls.filter(u => 
        u.includes("_sd") || 
        u.includes("browser_native_sd")
      );

      if (hdUrls.length > 0) {
        videoUrl = hdUrls[0];
      } else if (sdUrls.length > 0) {
        videoUrl = sdUrls[0];
      } else if (videoUrls.length > 0) {
        videoUrl = videoUrls[0];
      }

      if (!videoUrl) {
        const metaPatterns = [
          /<meta\s+property="og:video(?::secure_url)?"\s+content="([^"]+)"/gi,
          /<meta\s+property="og:video:url"\s+content="([^"]+)"/gi,
        ];

        for (const pattern of metaPatterns) {
          const match = pattern.exec(html);
          if (match && match[1]) {
            videoUrl = match[1]
              .replace(/&amp;/g, "&")
              .replace(/&quot;/g, '"');
            break;
          }
        }
      }

      if (!videoUrl) {
        await sendReact("❌");
        await sendErrorReply(
          "⚠️ Não consegui encontrar o vídeo neste post.\n\n" +
          "Possíveis causas:\n" +
          "• O vídeo é privado ou restrito\n" +
          "• O link está quebrado ou inválido\n" +
          "• O post foi deletado\n" +
          "• O Facebook mudou a estrutura da página\n\n" +
          "Tente com outro link ou verifique se o vídeo é público."
        );
        return;
      }

      await sendVideoFromURL(
        videoUrl,
        "🎬 *Vídeo do Facebook*\n\n💚 by DeadBoT",
        [],
        true
      );

      await sendReact("✅");
      
    } catch (err) {
      console.error("[FACEBOOK] Erro:", err.message || err);
      await sendReact("❌");
      await sendErrorReply(
        "🚫 Ocorreu um erro ao baixar o vídeo.\n\n" +
        "Verifique se:\n" +
        "• O link está correto\n" +
        "• O vídeo é público\n" +
        "• Sua conexão está estável\n\n" +
        "Tente novamente em alguns instantes."
      );
    }
  },
};