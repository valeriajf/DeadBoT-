/**
 * Faz download de música do Spotify direto (sem usar YouTube)
 * Aceita tanto links do Spotify quanto nome da música e cantor
 *
 * @author Adaptado do modelo #spot-mp3
 */

const { PREFIX } = require(`${BASE_DIR}/config`);
const axios = require("axios");
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "spotdl",
  description: "Faz download de música do Spotify por link ou nome!",
  commands: ["spotdl"],
  usage: `${PREFIX}spotdl link ou nome da música`,
  
  handle: async ({ 
    fullArgs,
    sendWaitReact,
    sendSuccessReact,
    sendErrorReply,
    sendImageFromURL,
    sendAudioFromBuffer,
  }) => {
    // Validação de parâmetros
    if (!fullArgs || !fullArgs.trim()) {
      throw new InvalidParameterError(
        "Você precisa enviar um link do Spotify ou o nome de uma música!\n\n" +
        "Exemplos:\n" +
        `${PREFIX}spotdl https://spotify.link/azIRLvE1vXb\n` +
        `${PREFIX}spotdl Blinding Lights The Weeknd`
      );
    }

    await sendWaitReact();

    try {
      let spotifyUrl = fullArgs.trim();
      let musicInfo = null;

      // Verifica se é um link do Spotify
      const isSpotifyLink = spotifyUrl.includes("spotify.com") || 
                           spotifyUrl.includes("spotify.link") || 
                           spotifyUrl.includes("spotify.app.link");

      if (isSpotifyLink) {
        // Se for link, extrai o Track ID e converte para URL completa
        spotifyUrl = await resolveSpotifyUrl(spotifyUrl);
        
        // Busca informações da música pelo link
        musicInfo = await getSpotifyInfoFromUrl(spotifyUrl);
      } else {
        // Se não for link, busca pelo nome
        musicInfo = await searchSpotifyTrack(fullArgs);
        spotifyUrl = musicInfo.url;
      }

      // Envia informações da música encontrada
      const caption = formatMusicCaption(musicInfo);
      await sendImageFromURL(musicInfo.image || musicInfo.thumbnail, caption);

      // Tenta baixar o áudio de múltiplas APIs
      const downloadUrl = await getDownloadUrl(spotifyUrl);

      if (!downloadUrl) {
        throw new WarningError(
          "Não foi possível encontrar um link de download válido para esta música. Tente novamente mais tarde."
        );
      }

      // Baixa o áudio
      const audioBuffer = await downloadAudio(downloadUrl);

      await sendSuccessReact();
      await sendAudioFromBuffer(audioBuffer, false, false);

    } catch (error) {
      console.error("Erro no comando spotdl:", error);
      
      if (error instanceof InvalidParameterError || error instanceof WarningError) {
        throw error;
      }
      
      await sendErrorReply(
        `❌ Erro ao buscar ou baixar a música: ${error.message}\n\nTente novamente ou use outro link/nome.`
      );
    }
  }
};

/**
 * Resolve links curtos do Spotify para URL completa e extrai Track ID
 * @param {string} spotifyLink - Link do Spotify (curto ou completo)
 * @returns {Promise<string>} URL completa do Spotify
 */
async function resolveSpotifyUrl(spotifyLink) {
  let trackId = null;

  // Tenta extrair Track ID direto do link completo
  if (spotifyLink.includes("open.spotify.com")) {
    const match = spotifyLink.match(/track\/([a-zA-Z0-9]+)/);
    if (match) {
      trackId = match[1];
      return `https://open.spotify.com/track/${trackId}`;
    }
  }

  // Se for link curto, resolve primeiro
  if (spotifyLink.includes("spotify.link") || spotifyLink.includes("spotify.app.link")) {
    try {
      const response = await axios.get(spotifyLink, {
        maxRedirects: 5,
        headers: { 'User-Agent': 'WhatsApp/2.23.20 A' },
        timeout: 10000
      });
      
      const html = response.data;
      const match = html.match(/track\/([a-zA-Z0-9]+)/);
      if (match) {
        trackId = match[1];
        return `https://open.spotify.com/track/${trackId}`;
      }
    } catch (error) {
      console.error("Erro ao resolver link curto:", error.message);
    }
  }

  if (!trackId) {
    throw new WarningError("Não foi possível extrair o ID da música do link!");
  }

  return `https://open.spotify.com/track/${trackId}`;
}

/**
 * Busca informações da música através da URL do Spotify
 * @param {string} spotifyUrl - URL completa do Spotify
 * @returns {Promise<Object>} Informações da música
 */
async function getSpotifyInfoFromUrl(spotifyUrl) {
  const trackId = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/)?.[1];
  
  if (!trackId) {
    throw new WarningError("ID da música inválido!");
  }

  try {
    // Tenta buscar informações via oEmbed
    const oembedUrl = `https://open.spotify.com/oembed?url=${spotifyUrl}`;
    const oembedResponse = await axios.get(oembedUrl, { timeout: 10000 });
    
    let title = "Título desconhecido";
    let thumbnail = null;
    let artist = "Artista desconhecido";
    let album = null;

    if (oembedResponse.data) {
      title = oembedResponse.data.title || title;
      thumbnail = oembedResponse.data.thumbnail_url || thumbnail;
    }

    // Tenta buscar mais informações da página
    try {
      const pageResponse = await axios.get(spotifyUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });
      
      const html = pageResponse.data;
      const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      
      if (ogDescMatch) {
        const parts = ogDescMatch[1].split(' · ');
        if (parts.length >= 1) artist = parts[0].trim();
        if (parts.length >= 2) album = parts[1].trim();
      }
    } catch (error) {
      console.log("Erro ao buscar detalhes da página:", error.message);
    }

    return {
      title,
      artist,
      album,
      image: thumbnail,
      thumbnail,
      url: spotifyUrl
    };

  } catch (error) {
    throw new WarningError("Não foi possível obter informações da música do link!");
  }
}

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
  
  if (data.url) {
    caption += `│ 🔗 *Link:* ${data.url}\n`;
  }
  
  caption += `│\n`;
  caption += `│ «── « ↻ ◁ 𝐈𝐈 ▷ ↺ » ──»\n`;
  caption += `│\n`;
  caption += `╰─⬣「 *💚 by DeadBoT* 」⬣`;
  
  return caption;
}

/**
 * Tenta obter URL de download de múltiplas APIs
 * @param {string} spotifyUrl - URL do Spotify
 * @returns {Promise<string|null>} URL de download
 */
async function getDownloadUrl(spotifyUrl) {
  const apis = [
    {
      name: "nekolabs",
      url: `https://api.nekolabs.my.id/downloader/spotify/v1?url=${encodeURIComponent(spotifyUrl)}`,
      extract: (data) => data?.result?.downloadUrl
    },
    {
      name: "sylphy",
      url: `https://api.sylphy.xyz/download/spotify?url=${encodeURIComponent(spotifyUrl)}&apikey=sylphy-c519`,
      extract: (data) => data?.status && data?.data?.dl_url ? data.data.dl_url : null
    },
    {
      name: "neoxr",
      url: `https://api.neoxr.eu/api/spotify?url=${encodeURIComponent(spotifyUrl)}&apikey=russellxz`,
      extract: (data) => data?.status && data?.data?.url ? data.data.url : null
    }
  ];

  for (const api of apis) {
    try {
      console.log(`Tentando API ${api.name}...`);
      const response = await axios.get(api.url, { 
        timeout: 20000,
        headers: { 'User-Agent': 'DeadBot/1.0' }
      });
      
      const downloadUrl = api.extract(response.data);
      
      if (downloadUrl && !downloadUrl.includes("undefined")) {
        console.log(`✓ API ${api.name} funcionou!`);
        return downloadUrl;
      }
    } catch (error) {
      console.log(`✗ API ${api.name} falhou:`, error.message);
    }
  }

  return null;
}

/**
 * Baixa o arquivo de áudio
 * @param {string} url - URL do áudio
 * @returns {Promise<Buffer>} Buffer do áudio
 */
async function downloadAudio(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 60000, // 60 segundos para downloads maiores
      maxContentLength: 50 * 1024 * 1024, // Máximo 50MB
      headers: { 'User-Agent': 'DeadBot/1.0' }
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    throw new WarningError("Erro ao baixar o áudio. O arquivo pode estar indisponível.");
  }
}