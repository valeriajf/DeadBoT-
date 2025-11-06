const { PREFIX } = require(`${BASE_DIR}/config`);
const axios = require("axios");
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const { download } = require(`${BASE_DIR}/services/spider-x-api`);

module.exports = {
  name: "spot-mp3",
  description: "Faço o download de músicas do Spotify pelo nome ou link!",
  commands: ["spot-mp3", "spotify-mp3", "spot", "spotify"],
  usage: `${PREFIX}spot-mp3 nome da música ou link`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    fullArgs,
    sendWaitReact,
    sendSuccessReact,
    sendErrorReply,
    sendImageFromURL,
    sendAudioFromURL,
  }) => {
    if (!fullArgs.length) {
      throw new InvalidParameterError(
        "Você precisa enviar o nome de uma música e o nome do cantor!"
      );
    }

    // Bloqueia se for um link
    if (fullArgs.includes("spotify.com") || fullArgs.includes("http")) {
      throw new InvalidParameterError(
        "❌ Links não são aceitos! Digite o nome da música e o nome do cantor.\n\nExemplo: #spot-mp3 Blinding Lights The Weeknd"
      );
    }

    await sendWaitReact();

    try {
      // Busca a música pelo nome
      const musicInfo = await searchSpotifyTrack(fullArgs);

      // Envia informações da música encontrada
      const caption = formatMusicCaption(musicInfo);
      await sendImageFromURL(musicInfo.image, caption);

      // Busca no YouTube e baixa via Spider X API (igual ao yt-mp3)
      const searchQuery = `${musicInfo.artist} ${musicInfo.title}`
        .replace(/ - Ao Vivo| \(Ao Vivo\)| - Remix| \(Remix\)/gi, '')
        .trim();

      console.log(`Buscando no YouTube: ${searchQuery}`);

      const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      const ytSearchResponse = await axios.get(ytSearchUrl, {
        timeout: 15000,
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const ytHtml = ytSearchResponse.data;
      const videoIdMatch = ytHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      
      if (!videoIdMatch) {
        throw new WarningError(
          `Não foi possível encontrar a música no YouTube!\n\n` +
          `🔍 Busca: ${searchQuery}`
        );
      }

      const videoId = videoIdMatch[1];
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

      console.log(`Vídeo encontrado: ${youtubeUrl}`);

      // Baixa via Spider X API (método do yt-mp3)
      const data = await download("yt-mp3", youtubeUrl);

      if (!data || !data.url) {
        throw new WarningError("Não foi possível fazer o download do áudio!");
      }

      await sendSuccessReact();
      await sendAudioFromURL(data.url);

    } catch (error) {
      console.error("Erro no comando spot-mp3:", error);
      
      if (error instanceof InvalidParameterError || error instanceof WarningError) {
        throw error;
      }
      
      await sendErrorReply(
        `Erro ao buscar ou baixar a música: ${error.message}`
      );
    }
  },
};

/**
 * Busca uma música no Spotify por nome
 * @param {string} query - Nome da música
 * @returns {Promise<Object>} Informações da música
 */
async function searchSpotifyTrack(query) {
  const searchUrl = `https://api.delirius.store/search/spotify?q=${encodeURIComponent(query)}&limit=1`;
  
  try {
    const response = await axios.get(searchUrl, { 
      timeout: 15000,
      headers: { 'User-Agent': 'DeadBot/1.0' }
    });

    if (!response.data.status || !response.data.data || response.data.data.length === 0) {
      throw new WarningError("❌ Nenhum resultado encontrado! Tente com outro nome.");
    }

    return response.data.data[0];
  } catch (error) {
    if (error instanceof WarningError) throw error;
    throw new WarningError("Erro ao buscar a música. Tente novamente.");
  }
}

/**
 * Formata as informações da música para exibição
 * @param {Object} data - Dados da música
 * @returns {string} Texto formatado
 */
function formatMusicCaption(data) {
  let caption = `╭─⬣「 *SPOTIFY DOWNLOAD* 」⬣\n`;
  caption += `│\n`;
  caption += `│ 🎵 *Título:* ${data.title}\n`;
  caption += `│ 🎤 *Artista:* ${data.artist}\n`;
  
  if (data.album) {
    caption += `│ 💿 *Álbum:* ${data.album}\n`;
  }
  
  if (data.duration) {
    caption += `│ ⏱️ *Duração:* ${data.duration}\n`;
  }
  
  if (data.popularity) {
    caption += `│ ⭐ *Popularidade:* ${data.popularity}%\n`;
  }
  
  if (data.publish) {
    caption += `│ 📅 *Publicado:* ${data.publish}\n`;
  }
  
  caption += `│ 🔗 *Link:* ${data.url}\n`;
  caption += `│\n`;
  caption += `╰─⬣「 *Baixando via YouTube...* 」⬣`;
  
  return caption;
}