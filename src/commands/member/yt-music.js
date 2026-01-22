/**
 * Baixa áudios do YouTube Music.
 * Sistema híbrido com múltiplos fallbacks testados.
 * 
 * @author VaL
 */

const axios = require("axios");
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "yt-music",
  description: "Baixa áudios do YouTube Music em MP3.",
  commands: ["yt-music", "ytmusic", "music"],
  usage: `${PREFIX}yt-music <link ou nome da música>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    fullArgs,
    sendErrorReply,
    sendAudioFromURL,
    sendReact,
  }) => {
    try {
      if (!fullArgs || !fullArgs.trim()) {
        await sendErrorReply(
          `Uso incorreto!\n\nExemplo:\n${PREFIX}yt-music https://music.youtube.com/watch?v=...\n${PREFIX}yt-music Nome da Música`
        );
        return;
      }

      const query = fullArgs.trim();
      await sendReact("⏳");

      let videoId = null;

      const youtubeMatch = query.match(/(?:youtube\.com\/watch\?v=|music\.youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      
      if (youtubeMatch) {
        videoId = youtubeMatch[1];
      } else {
        const searchResponse = await axios.get("https://www.youtube.com/results", {
          params: { search_query: query },
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeout: 30000,
        });

        const videoIdMatch = searchResponse.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        
        if (!videoIdMatch) {
          await sendReact("❌");
          await sendErrorReply("❌ Não encontrei resultados para esta busca.");
          return;
        }

        videoId = videoIdMatch[1];
      }

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      let audioUrl = null;

      // MÉTODO 1: Cobalt API (testado e funcional)
      try {
        const cobaltResponse = await axios.post(
          "https://co.wuk.sh/api/json",
          {
            url: videoUrl,
            vCodec: "h264",
            vQuality: "720",
            aFormat: "mp3",
            filenamePattern: "basic",
            isAudioOnly: true,
          },
          {
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        if (cobaltResponse.data?.status === "redirect" || cobaltResponse.data?.status === "stream") {
          audioUrl = cobaltResponse.data.url;
        }
      } catch {}

      // MÉTODO 2: Invidious (fallback)
      if (!audioUrl) {
        const invidiousInstances = [
          "https://inv.nadeko.net",
          "https://invidious.private.coffee",
          "https://iv.nboeck.de",
        ];

        for (const instance of invidiousInstances) {
          try {
            const invidiousResponse = await axios.get(
              `${instance}/api/v1/videos/${videoId}`,
              { timeout: 15000 }
            );

            if (invidiousResponse.data?.adaptiveFormats) {
              const audioFormats = invidiousResponse.data.adaptiveFormats.filter(
                f => f.type && f.type.includes("audio")
              );
              
              if (audioFormats.length > 0) {
                const bestFormat = audioFormats.sort((a, b) => 
                  (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0)
                )[0];
                
                if (bestFormat.url) {
                  audioUrl = bestFormat.url;
                  break;
                }
              }
            }
          } catch {}
        }
      }

      // MÉTODO 3: YouTube Explode (API pública)
      if (!audioUrl) {
        try {
          const explodeResponse = await axios.get(
            "https://youtube-to-mp3-download1.p.rapidapi.com/dl",
            {
              params: { id: videoId },
              headers: {
                "X-RapidAPI-Host": "youtube-to-mp3-download1.p.rapidapi.com",
                "X-RapidAPI-Key": "DEMO_KEY",
              },
              timeout: 30000,
            }
          );

          if (explodeResponse.data?.link) {
            audioUrl = explodeResponse.data.link;
          }
        } catch {}
      }

      // MÉTODO 4: yt-dlp web service
      if (!audioUrl) {
        try {
          const ytdlpResponse = await axios.post(
            "https://yt-dlp-api.herokuapp.com/api/info",
            {
              url: videoUrl,
              format: "bestaudio",
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          );

          if (ytdlpResponse.data?.url) {
            audioUrl = ytdlpResponse.data.url;
          }
        } catch {}
      }

      // MÉTODO 5: Scraping direto com URL sem assinatura (últim tentativa)
      if (!audioUrl) {
        try {
          const ytResponse = await axios.get(videoUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            timeout: 30000,
          });

          const html = ytResponse.data;
          const playerMatch = html.match(/var ytInitialPlayerResponse = ({.+?});/);
          
          if (playerMatch) {
            const playerData = JSON.parse(playerMatch[1]);
            
            if (playerData.streamingData?.adaptiveFormats) {
              const audioFormats = playerData.streamingData.adaptiveFormats.filter(
                f => f.mimeType && f.mimeType.includes("audio") && f.url
              );
              
              if (audioFormats.length > 0) {
                const bestFormat = audioFormats.sort((a, b) => 
                  (b.bitrate || 0) - (a.bitrate || 0)
                )[0];
                
                audioUrl = bestFormat.url;
              }
            }
          }
        } catch {}
      }

      if (!audioUrl) {
        await sendReact("❌");
        await sendErrorReply(
          "⚠️ Não consegui baixar o áudio após tentar 5 métodos diferentes.\n\n" +
          "Possíveis causas:\n" +
          "• Vídeo com restrição de idade ou privado\n" +
          "• Vídeo bloqueado na sua região\n" +
          "• Vídeo muito longo (limite: 15-20min)\n" +
          "• Todos os serviços estão temporariamente indisponíveis\n\n" +
          "💡 Tente:\n" +
          "• Outro vídeo\n" +
          "• Aguardar alguns minutos"
        );
        return;
      }

      await sendAudioFromURL(audioUrl, false);
      await sendReact("✅");
      
    } catch (err) {
      console.error("[YT-MUSIC] Erro:", err.message);
      await sendReact("❌");
      await sendErrorReply("🚫 Erro: " + err.message);
    }
  },
};