const axios = require("axios");
const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "lyrics",
  description: "Busca letra de músicas",
  commands: ["lyrics", "letra", "lyric"],
  usage: `${PREFIX}lyrics nome da música`,
  handle: async ({
    sendReply,
    sendWaitReact,
    sendSuccessReact,
    args,
    fullArgs,
  }) => {
    // Validação de parâmetros
    if (!args.length || !fullArgs.trim()) {
      throw new InvalidParameterError(
        `Você precisa fornecer o nome da música!\n\nExemplo: ${PREFIX}lyrics Bohemian Rhapsody`
      );
    }

    await sendWaitReact();

    try {
      // Busca inicial na API do Letras.mus.br
      const searchResponse = await axios.get(
        `https://solr.sscdn.co/letras/m1/?q=${encodeURIComponent(fullArgs)}&wt=json&callback=LetrasSug`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        }
      );

      if (searchResponse.status !== 200) {
        throw new Error("Erro ao buscar letra da música");
      }

      // Parse JSONP response
      const jsonData = searchResponse.data
        .replace("LetrasSug(", "")
        .replace(")\n", "");
      const parsedData = JSON.parse(jsonData);

      if (!parsedData?.response?.docs?.length) {
        await sendReply(
          `❌ Nenhuma música encontrada para: *${fullArgs}*\n\nTente ser mais específico (ex: ${PREFIX}lyrics nome da música - artista)`
        );
        return;
      }

      const lyric = parsedData.response.docs[0];
      if (!lyric?.dns || !lyric?.url) {
        throw new Error("Letra não encontrada");
      }

      // Busca a página da letra
      const lyricUrl = `https://www.letras.mus.br/${lyric.dns}/${lyric.url}`;
      const lyricResponse = await axios.get(lyricUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      if (lyricResponse.status !== 200) {
        throw new Error("Sem resposta do servidor");
      }

      // Parse HTML usando regex (sem linkedom)
      const html = lyricResponse.data;

      // Extrai título
      const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/);
      const title = titleMatch 
        ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
        : "Título não disponível";

      // Extrai artista
      const artistMatch = html.match(/<h2[^>]*class="textStyle-secondary"[^>]*>(.*?)<\/h2>/);
      const artist = artistMatch
        ? artistMatch[1].replace(/<[^>]*>/g, "").trim()
        : "Artista não disponível";

      // Extrai letra (procura por div com classe lyric-original)
      const lyricMatch = html.match(/<div[^>]*class="[^"]*lyric-original[^"]*"[^>]*>(.*?)<\/div>/s);
      
      if (!lyricMatch) {
        throw new Error("Letra não encontrada na página");
      }

      // Processa a letra
      const lyricContent = lyricMatch[1];
      
      // Extrai parágrafos
      const paragraphs = lyricContent.match(/<p[^>]*>(.*?)<\/p>/gs) || [];
      
      if (!paragraphs.length) {
        throw new Error("Letra não encontrada");
      }

      // Processa cada parágrafo
      const lyricsText = paragraphs
        .map(p => {
          // Remove tags HTML mas preserva <br> como quebras de linha
          return p
            .replace(/<p[^>]*>/g, "")
            .replace(/<\/p>/g, "")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]*>/g, "")
            .trim();
        })
        .filter(stanza => stanza)
        .join("\n\n");

      // Limita o tamanho da mensagem (WhatsApp tem limite)
      const maxLength = 4000;
      let finalLyrics = lyricsText;
      
      if (finalLyrics.length > maxLength) {
        finalLyrics = finalLyrics.substring(0, maxLength) + "\n\n_... (letra muito longa, cortada)_";
      }

      // Formata a resposta
      const formattedOutput = `🎵 *${title}* 🎵
🎤 Artista: ${artist}
🔗 ${lyricUrl}

📜 *Letra*:
${finalLyrics}`;

      await sendSuccessReact();
      await sendReply(formattedOutput);

    } catch (error) {
      console.error("Erro no comando lyrics:", error);
      
      await sendReply(
        `❌ Erro ao buscar letra da música.\n\n` +
        `Detalhes: ${error.message}\n\n` +
        `Tente novamente ou use outra busca.`
      );
    }
  },
};