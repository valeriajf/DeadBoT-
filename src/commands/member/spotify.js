/**
 * Faz download de músicas do Spotify via API externa.
 * Pesquisa por título, artista ou palavras-chave.
 *
 * @author Dev VaL
 */

const axios = require("axios");
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "spotify",
  description: "Baixa músicas do Spotify via API externa.",
  commands: ["spotify", "spotdl", "spdl"],
  usage: `${PREFIX}spotify <música/artista>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    fullArgs,
    sendWaitReply,
    sendErrorReply,
    sendImageFromURL,
    sendAudioFromURL,
    sendSuccessReply,
  }) => {
    try {
      if (!fullArgs || !fullArgs.trim()) {
        await sendErrorReply(
          `Uso incorreto!\n\nExemplo:\n${PREFIX}spotify con calma`
        );
        return;
      }

      // Reage com ⏳ e avisa que está processando
      await sendWaitReply("🎧 Buscando música no Spotify...");

      const query = fullArgs.trim();
      const apiUrl = `https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(
        query
      )}`;

      const { data } = await axios.get(apiUrl, {
        timeout: 20000,
        headers: { "user-agent": "Mozilla/5.0" },
      });

      if (!data?.status || !data?.result) {
        throw new Error("Nenhum resultado encontrado para esta pesquisa.");
      }

      const r = data.result;
      const title = r.title || r.name || "Título desconhecido";
      const artist = r.artist || "Artista desconhecido";
      const duration = r.duration || "Duração desconhecida";
      const url = r.url || "Sem link disponível";
      const audioUrl = r.audio;
      const cover = r.thumbnails;

      if (!audioUrl) {
        await sendErrorReply("❌ Nenhum áudio disponível para este resultado.");
        return;
      }

      const caption = `🎵 *${title}*\n👤 ${artist}\n⏱ ${duration}\n🔗 ${url}`;

      // Envia capa da música com informações
      if (cover) {
        await sendImageFromURL(cover, caption, [], true);
      } else {
        await sendSuccessReply(caption);
      }

      // Envia o áudio como MP3
      await sendAudioFromURL(audioUrl, false, true);

      // Reação final de sucesso
      await sendSuccessReply("💚 by DeadBoT");
    } catch (err) {
      console.error("[SPOTIFY] Erro:", err.message || err);
      await sendErrorReply(
        "⚠️ Falha ao buscar música no Spotify. Tente novamente mais tarde."
      );
    }
  },
};