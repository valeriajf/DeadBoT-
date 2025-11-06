const { PREFIX } = require(`../../config`);
const { download } = require(`../../services/spider-x-api`);
const { WarningError, InvalidParameterError } = require(`../../errors`);

module.exports = {
  name: "spotdl",
  description: "Faz download de música do Spotify via YouTube",
  commands: ["spotdl", "spotifydownload", "downloadspotify"],
  usage: `${PREFIX}spotdl https://spotify.link/azIRLvE1vXb`,
  handle: async ({ 
    fullArgs,
    sendAudioFromURL,
    sendImageFromURL,
    sendErrorReply,
    sendWaitReact,
    sendSuccessReact,
    sendReply
  }) => {
    console.log("=== COMANDO SPOTDL INICIADO ===");
    
    if (!fullArgs || fullArgs.trim() === "") {
      throw new InvalidParameterError(
        "Você precisa enviar um link do Spotify!\n\n" +
        "Exemplo: #spotdl https://spotify.link/azIRLvE1vXb"
      );
    }

    const spotifyLink = fullArgs.trim();
    console.log("Link recebido:", spotifyLink);

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
        console.log("Extraindo Track ID do link curto...");
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

      console.log("✅ Track ID:", trackId);

      // Busca informações da música do Spotify
      console.log("\n=== BUSCANDO INFORMAÇÕES DO SPOTIFY ===");
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
        
        console.log("✅ Info do Spotify:", musicaInfo);
      } catch (e) {
        console.log("⚠️ Erro ao buscar info do Spotify:", e.message);
      }

      if (!musicaInfo || !musicaInfo.title) {
        throw new WarningError("Não foi possível obter informações da música!");
      }

      // Monta query de busca para o YouTube
      const searchQuery = `${musicaInfo.artists} ${musicaInfo.title}`
        .replace(/ - Ao Vivo| \(Ao Vivo\)| - Remix/g, '')
        .trim();
      
      console.log("\n=== BUSCANDO NO YOUTUBE ===");
      console.log("Query:", searchQuery);

      // Busca o vídeo no YouTube
      const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      
      const ytSearchResponse = await fetch(ytSearchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      const ytHtml = await ytSearchResponse.text();
      const videoIdMatch = ytHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      
      if (!videoIdMatch) {
        console.log("❌ Video ID não encontrado");
        throw new WarningError(
          `Não foi possível encontrar a música no YouTube!\n\n` +
          `🔍 Busca: ${searchQuery}`
        );
      }

      const videoId = videoIdMatch[1];
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log("✅ Video ID:", videoId);
      console.log("✅ YouTube URL:", youtubeUrl);

      // USA O MESMO SERVIÇO DO #yt-mp3
      console.log("\n=== BAIXANDO VIA SPIDER X API (yt-mp3) ===");
      const data = await download("yt-mp3", youtubeUrl);

      if (!data) {
        throw new WarningError("Não foi possível fazer o download!");
      }

      console.log("✅ Download realizado com sucesso!");
      console.log("Dados:", JSON.stringify(data, null, 2));

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
      } catch (e) {
        console.log("Não foi possível obter álbum");
      }

      // Envia thumbnail com informações (sem referências ao YouTube)
      await sendImageFromURL(
        musicaInfo.thumbnail || data.thumbnail,
        `🎵 *${musicaInfo.title}*
🎤 *Artista:* ${musicaInfo.artists}
💿 *${album}*
⏱️ *Duração:* ${data.total_duration_in_seconds}s
«── « ↻ ◁ 𝐈𝐈 ▷ ↺ » ──»
💚 *By DeadBoT*`
      );

      // Envia o áudio
      console.log("Enviando áudio...");
      await sendAudioFromURL(data.url);
      console.log("✅ ÁUDIO ENVIADO COM SUCESSO!");

    } catch (error) {
      console.error("\n=== ERRO ===");
      console.error("Tipo:", error.name);
      console.error("Mensagem:", error.message);
      
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