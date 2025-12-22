/**
 * Baixa vídeos e imagens do Threads (Instagram Threads).
 * Faz scraping direto do HTML sem usar APIs externas.
 *
 * @author VaL
 */

const axios = require("axios");
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "threads",
  description: "Baixa vídeos e imagens do Threads em alta qualidade.",
  commands: ["threads", "thread"],
  usage: `${PREFIX}threads <link do post>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    fullArgs,
    sendErrorReply,
    sendReact,
    sendVideoFromURL,
    sendImageFromURL,
    sendSuccessReply,
  }) => {
    try {
      // Verifica se o link foi informado
      if (!fullArgs || !fullArgs.trim()) {
        await sendErrorReply(
          `❌ Cadê o link do Threads?\n\nExemplo:\n${PREFIX}threads https://www.threads.net/@user/post/...`
        );
        return;
      }

      const url = fullArgs.trim();

      // Valida o link (threads.net ou threads.com)
      if (!url.includes("threads.net") && !url.includes("threads.com")) {
        await sendErrorReply("❌ Isso não parece um link do Threads.");
        return;
      }

      // Reação de loading
      await sendReact("⏳");

      // Extrai o post ID da URL
      const postIdMatch = url.match(/post\/([A-Za-z0-9_-]+)/);
      if (!postIdMatch) {
        await sendReact("❌");
        await sendErrorReply("❌ Não consegui identificar o ID do post no link.");
        return;
      }

      const postId = postIdMatch[1];

      // Faz requisição para buscar os dados do post
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
        },
        timeout: 30000,
        maxRedirects: 5,
      });

      const html = response.data;

      let username = "Desconhecido";
      let caption = "";
      let mediaUrls = [];

      // Busca padrões de URL de mídia - formato JSON
      const allMediaPatterns = [
        // Padrão JSON: "url":"https:\/\/...mp4"
        /"url":"(https?:[^"]*\.mp4[^"]*)"/gi,
        // Padrão JSON: "url":"https:\/\/...jpg|jpeg|webp"
        /"url":"(https?:[^"]*\.(jpg|jpeg|webp)[^"]*)"/gi,
      ];

      const foundUrls = new Set();

      // Busca por todos os padrões
      allMediaPatterns.forEach((pattern) => {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            // Decodifica escapes do JSON
            let cleanUrl = match[1]
              .replace(/\\\//g, "/")
              .replace(/\\u002F/g, "/")
              .replace(/&amp;/g, "&");
            
            // Filtra URLs válidas (fbcdn.net ou cdninstagram.com)
            if (
              (cleanUrl.includes("fbcdn.net") || cleanUrl.includes("cdninstagram.com")) &&
              !cleanUrl.includes("profile_pic") &&
              !cleanUrl.includes("150x150") &&
              !cleanUrl.includes("44x44") &&
              !cleanUrl.includes("avatar")
            ) {
              foundUrls.add(cleanUrl);
            }
          }
        }
      });

      // Separa vídeos e imagens
      const videos = Array.from(foundUrls).filter((u) => u.includes(".mp4"));
      const images = Array.from(foundUrls).filter((u) => 
        u.match(/\.(jpg|jpeg|webp)/i)
      );
      
      // Filtra imagens de alta qualidade
      const highQualityImages = images.filter(img => 
        img.includes("1080x") || 
        img.includes("1440x") || 
        img.includes("720x") ||
        img.includes("s1080x1080") ||
        (!img.includes("150x") && !img.includes("320x"))
      );

      // Busca username no HTML
      const usernameMatch = html.match(/@([a-zA-Z0-9._]+)/);
      if (usernameMatch) {
        username = usernameMatch[1];
      }

      // Busca caption/texto
      const captionMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
      if (captionMatch) {
        caption = captionMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      }

      // Prioriza vídeos
      if (videos.length > 0) {
        mediaUrls.push({ type: "video", url: videos[0] });
      } else if (highQualityImages.length > 0) {
        // Pega até 10 imagens únicas em alta resolução
        const uniqueImages = [...new Set(highQualityImages)].slice(0, 10);
        uniqueImages.forEach((img) => {
          mediaUrls.push({ type: "image", url: img });
        });
      } else if (images.length > 0) {
        // Fallback: pega qualquer imagem
        const uniqueImages = [...new Set(images)].slice(0, 10);
        uniqueImages.forEach((img) => {
          mediaUrls.push({ type: "image", url: img });
        });
      }

      // Verifica se encontrou alguma mídia
      if (mediaUrls.length === 0) {
        await sendReact("❌");
        await sendErrorReply(
          "⚠️ Não consegui encontrar mídia neste post.\n\nPossíveis causas:\n• O post é privado\n• O formato do Threads mudou\n• O link está inválido"
        );
        return;
      }

      // Monta a legenda
      const legendaPost = `🧵 *Threads Download*\n\n💚 by DeadBoT`;

      // Envia a mídia
      if (mediaUrls[0].type === "video") {
        // Envia o vídeo diretamente da URL
        await sendVideoFromURL(
          mediaUrls[0].url,
          legendaPost,
          [],
          true
        );

        await sendReact("✅");
      } else {
        // Envia imagem(ns)
        if (mediaUrls.length === 1) {
          // Envia imagem única
          await sendImageFromURL(
            mediaUrls[0].url,
            legendaPost
          );

          await sendReact("✅");
        } else {
          // Múltiplas imagens
          await sendSuccessReply(
            `📸 Este post contém ${mediaUrls.length} imagens. Enviando todas...\n\n${legendaPost}`
          );

          for (let i = 0; i < mediaUrls.length; i++) {
            await sendImageFromURL(
              mediaUrls[i].url,
              `📷 Imagem ${i + 1}/${mediaUrls.length}\n\n💚 by DeadBoT`
            );

            // Delay entre envios
            if (i < mediaUrls.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          }

          await sendReact("✅");
        }
      }
    } catch (err) {
      console.error("[THREADS] Erro:", err.message || err);
      console.error("[THREADS] Stack:", err.stack);
      await sendReact("❌");
      await sendErrorReply(
        "🚫 Ocorreu um erro ao processar o link do Threads.\n\nVerifique se o post é público e tente novamente."
      );
    }
  },
};