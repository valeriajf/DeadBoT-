const { PREFIX } = require(`${BASE_DIR}/config`);
const { play } = require(`${BASE_DIR}/services/spider-x-api`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "play-audio",
  description: "Faço o download de músicas",
  commands: ["play-audio", "play", "pa"],
  usage: `${PREFIX}play-audio MC Hariel`,
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
        "Você precisa me dizer o que deseja buscar!"
      );
    }

    if (fullArgs.includes("http://") || fullArgs.includes("https://")) {
      throw new InvalidParameterError(
        `Você não pode usar links para baixar músicas! Use ${PREFIX}yt-mp3 link`
      );
    }

    await sendWaitReact();

    try {
      const data = await play("audio", fullArgs);

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

      // Remover informações extras do título (como "Ao Vivo", "Official Video", etc)
      // mas manter se for importante
      const albumInfo = title.match(/\((.*?)\)/);
      const album = albumInfo ? albumInfo[1] : "Single";

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