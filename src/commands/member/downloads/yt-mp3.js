const { PREFIX } = require(`${BASE_DIR}/config`);
const { download } = require(`${BASE_DIR}/services/spider-x-api`);
const { WarningError } = require(`${BASE_DIR}/errors`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "yt-mp3",
  description: "Faço o download de áudios do YouTube pelo link!",
  commands: ["yt-mp3", "youtube-mp3", "yt-audio", "youtube-audio", "mp3"],
  usage: `${PREFIX}yt-mp3 https://www.youtube.com/watch?v=mW8o_WDL91o`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    sendAudioFromURL,
    sendImageFromURL,
    fullArgs,
    sendWaitReact,
    sendSuccessReact,
    sendErrorReply,
  }) => {
    if (!fullArgs.length) {
      throw new InvalidParameterError(
        "Você precisa enviar uma URL do YouTube!"
      );
    }

    await sendWaitReact();

    if (!fullArgs.includes("you")) {
      throw new WarningError("O link não é do YouTube!");
    }

    try {
      const data = await download("yt-mp3", fullArgs);

      if (!data) {
        await sendErrorReply("Nenhum resultado encontrado!");
        return;
      }

      await sendSuccessReact();

      // Extrair o título e artista do título completo
      let title = data.title;
      let artist = data.channel.name;
      
      // Tentar extrair artista e título se estiver no formato "Artista - Título"
      if (title.includes(' - ')) {
        const parts = title.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }

      // Extrair informações do álbum se houver entre parênteses
      const albumInfo = title.match(/\((.*?)\)/);
      const album = albumInfo ? albumInfo[1] : "YouTube";

      await sendImageFromURL(
        data.thumbnail,
        `🎵 *${title}*
🎤 *Artista:* ${artist}
💿 *${album}*
⏱️ *Duração:* ${data.total_duration_in_seconds}s
«── « ↻ ◁ 𝐈𝐈 ▷ ↺ » ──»
💚 *By DeadBoT*`
      );

      await sendAudioFromURL(data.url);
    } catch (error) {
      console.log(error);
      await sendErrorReply(error.message);
    }
  },
};