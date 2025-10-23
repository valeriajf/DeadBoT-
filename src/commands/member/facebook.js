/**
 * Baixa vídeos do Facebook via API externa.
 * Suporta URLs diretas ou compartilhadas.
 *
 * @author VaL
 */

const axios = require("axios");
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "facebook",
  description: "Baixa vídeos do Facebook em HD/SD.",
  commands: ["facebook", "fb", "fbvideo", "fbdl"],
  usage: `${PREFIX}facebook <link do vídeo>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    fullArgs,
    sendWaitReply,
    sendErrorReply,
    sendVideoFromURL,
    sendSuccessReply,
  }) => {
    try {
      // Verifica se o link foi informado
      if (!fullArgs || !fullArgs.trim()) {
        await sendErrorReply(
          `Uso incorreto!\n\nExemplo:\n${PREFIX}facebook https://www.facebook.com/...`
        );
        return;
      }

      const url = fullArgs.trim();

      // Valida o link
      if (!url.includes("facebook.com")) {
        await sendErrorReply("❌ Isso não parece um link do Facebook.");
        return;
      }

      // Avisa que está processando
      await sendWaitReply("📺 Baixando vídeo do Facebook...");

      // Primeiro tenta resolver URLs curtas (redirects)
      let resolvedUrl = url;
      try {
        const res = await axios.get(url, {
          timeout: 20000,
          maxRedirects: 10,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        const possible = res?.request?.res?.responseUrl;
        if (possible && typeof possible === "string") {
          resolvedUrl = possible;
        }
      } catch {
        // ignora se não conseguir resolver
      }

      // Função auxiliar para tentar API externa
      async function fetchFromApi(u) {
        const apiUrl = `https://api.princetechn.com/api/download/facebook?apikey=prince&url=${encodeURIComponent(
          u
        )}`;
        return axios.get(apiUrl, {
          timeout: 40000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
          },
          maxRedirects: 5,
          validateStatus: (s) => s >= 200 && s < 500,
        });
      }

      // Primeira tentativa com URL resolvida, fallback para original
      let response;
      try {
        response = await fetchFromApi(resolvedUrl);
        if (!response || response.status >= 400 || !response.data)
          throw new Error("Erro na API");
      } catch {
        response = await fetchFromApi(url);
      }

      const data = response.data;

      // Verifica resposta
      if (!data || data.status !== 200 || !data.success || !data.result) {
        await sendErrorReply(
          "⚠️ A API não retornou um resultado válido. Tente novamente mais tarde!"
        );
        return;
      }

      const videoUrl = data.result.hd_video || data.result.sd_video;

      if (!videoUrl) {
        await sendErrorReply(
          "❌ Não foi possível obter o link de vídeo. Verifique se o vídeo é público."
        );
        return;
      }

      // Envia o vídeo diretamente do link remoto
      await sendVideoFromURL(
        videoUrl,
        "🎬 Vídeo baixado com sucesso!\n\n_Enviado pelo DeadBoT_",
        [],
        true
      );

      await sendSuccessReply("✅ Download concluído com sucesso!");
    } catch (err) {
      console.error("[FACEBOOK] Erro:", err.message || err);
      await sendErrorReply(
        "🚫 Ocorreu um erro ao baixar o vídeo. Tente novamente mais tarde."
      );
    }
  },
};