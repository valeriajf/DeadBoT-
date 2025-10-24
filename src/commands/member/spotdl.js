const { PREFIX } = require(`../../config`);
const { download } = require(`../../services/spider-x-api`);
const { WarningError, InvalidParameterError } = require(`../../errors`);

module.exports = {
  name: "spotdl",
  description: "Faz download de música do Spotify via YouTube",
  commands: ["spotdl"],
  usage: `${PREFIX}spotdl https://spotify.link/azIRLvE1vXb`,
  handle: async ({ 
    fullArgs,
    sendAudioFromURL,
    sendImageFromURL,
    sendErrorReply,
    sendWaitReact,
    sendSuccessReact
  }) => {

    if (!fullArgs || fullArgs.trim() === "") {
      throw new InvalidParameterError(
        "Você precisa enviar um link do Spotify!\n\n" +
        "Exemplo: #spotdl https://spotify.link/azIRLvE1vXb"
      );
    }

    const spotifyLink = fullArgs.trim();

    if (!spotifyLink.includes("spotify")) {
      throw new WarningError("O link não é do Spotify!");
    }

    await sendWaitReact();

    try {
      let trackId = null;

      // Extrai Track ID do Spotify
      if (spotifyLink.includes("open.spotify.com")) {
        const match = spotifyLink.match(/track\/([a-zA-Z0-9]+)/);
        if (match) trackId = match[1];
      }

      if (!trackId && (spotifyLink.includes("spotify.link") || spotifyLink.includes("spotify.app.link"))) {
        const response = await fetch(spotifyLink, {
          headers: { 'User-Agent': 'WhatsApp/2.23.20 A' }
        });
        const html = await response.text();
        const match = html.match(/track\/([a-zA-Z0-9]+)/);
        if (match) trackId = match[1];
      }

      if (!trackId) {
        throw new WarningError("Não foi possível extrair o ID da música!");
      }

      // Busca informações da música do Spotify
      let musicaInfo = null;
      
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
        const oembedResponse = await fetch(oembedUrl);
        
        if (oembedResponse.ok) {
          const oembedData = await oembedResponse.json();
          musicaInfo = { 
            title: oembedData.title,
            thumbnail: oembedData.thumbnail_url,
            artists: null 
          };
        }

        const pageUrl = `https://open.spotify.com/track/${trackId}`;
        const pageResponse = await fetch(pageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const html = await pageResponse.text();
        const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
        
        if (ogDescMatch) {
          const parts = ogDescMatch[1].split(' · ');
          if (parts.length >= 1) {
            musicaInfo.artists = parts[0].trim();
          }
        }
      } catch {}

      if (!musicaInfo || !musicaInfo.title) {
        throw new WarningError("Não foi possível obter informações da música!");
      }

      // Monta query de busca para o YouTube
      const searchQuery = `${musicaInfo.artists} ${musicaInfo.title}`
        .replace(/ - Ao Vivo| \(Ao Vivo\)| - Remix/g, '')
        .trim();

      // Busca o vídeo no YouTube
      const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      const ytSearchResponse = await fetch(ytSearchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      const ytHtml = await ytSearchResponse.text();
      const videoIdMatch = ytHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      
      if (!videoIdMatch) {
        throw new WarningError(
          `Não foi possível encontrar a música no YouTube!\n\n` +
          `🔍 Busca: ${searchQuery}`
        );
      }

      const videoId = videoIdMatch[1];
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Faz o download via Spider X API
      const data = await download("yt-mp3", youtubeUrl);

      if (!data) {
        throw new WarningError("Não foi possível fazer o download!");
      }

      await sendSuccessReact();

      // Busca o álbum das informações do Spotify
      let album = "Álbum";
      try {
        const pageUrl = `https://open.spotify.com/track/${trackId}`;
        const pageResponse = await fetch(pageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const html = await pageResponse.text();
        const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
        
        if (ogDescMatch) {
          const parts = ogDescMatch[1].split(' · ');
          if (parts.length >= 2) {
            album = parts[1].trim(); // Segundo item é o álbum
          }
        }
      } catch {}

      // Envia thumbnail com informações
      await sendImageFromURL(
        musicaInfo.thumbnail || data.thumbnail,
        `🎵 *${musicaInfo.title}*
🎤 *Artista:* ${musicaInfo.artists}
💿 *${album}*
⏱️ *Duração:* ${data.total_duration_in_seconds}s
«── « ↻ ◁ 𝐈𝐈 ▷ ↺ » ──»
💚 by DeadBoT`
      );

      // Envia o áudio
      await sendAudioFromURL(data.url);

    } catch (error) {
      if (error instanceof WarningError || error instanceof InvalidParameterError) {
        throw error;
      }
      
      await sendErrorReply(
        `⚠️ Erro ao processar: ${error.message}\n\n` +
        `💡 Tente novamente ou use #yt-mp3 diretamente!`
      );
    }
  }
};