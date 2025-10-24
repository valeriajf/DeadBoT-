/**
 * Gera vídeos com base em prompts de texto usando a API Sora (txt2video).
 * Usa o endpoint da Okatsu Rolez API.
 *
 * @author VaL
 */

const axios = require("axios");
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "sora",
  description: "Gera vídeos a partir de texto com IA (Okatsu API).",
  commands: ["sora", "txt2video", "aivideo"],
  usage: `${PREFIX}sora <descrição do vídeo>`,
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
      const prompt = fullArgs?.trim();

      if (!prompt) {
        await sendErrorReply(
          `Uso incorreto!\n\nExemplo:\n${PREFIX}sora anime girl with blue hair`
        );
        return;
      }

      // Informa que está gerando o vídeo
      await sendWaitReply("🎬 Gerando vídeo com IA... (pode demorar alguns segundos)");

      const apiUrl = `https://okatsu-rolezapiiz.vercel.app/ai/txt2video?text=${encodeURIComponent(
        prompt
      )}`;

      const { data } = await axios.get(apiUrl, {
        timeout: 60000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      const videoUrl = data?.videoUrl || data?.result || data?.data?.videoUrl;

      if (!videoUrl) {
        await sendErrorReply(
          "❌ Nenhum vídeo retornado pela API. Tente um prompt diferente."
        );
        return;
      }

      // Envia o vídeo diretamente do link remoto
      await sendVideoFromURL(
        videoUrl,
        `🎞️ *Prompt:* ${prompt}`,
        [],
        true
      );

      await sendSuccessReply("✅ Vídeo gerado com sucesso!");
    } catch (err) {
      console.error("[SORA] Erro:", err.message || err);
      await sendErrorReply(
        "⚠️ Falha ao gerar vídeo. A API pode estar temporariamente fora do ar."
      );
    }
  },
};