const fs = require("fs");
const path = require("path");
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { setWelcome7Gif } = require(`${BASE_DIR}/utils/database`);

module.exports = {
  name: "set-gif-bv7",
  description: "Define o GIF de boas-vindas do grupo",
  commands: ["set-gif-bv7"],
  usage: `${PREFIX}set-gif-bv7 (responder GIF/vídeo)`,
  handle: async ({
    isGroup,
    isReply,
    isVideo,
    remoteJid,
    downloadVideo,
    webMessage,
    sendSuccessReply,
    sendWaitReact,
  }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Somente em grupos!");
    }

    if (!isReply || !isVideo) {
      throw new InvalidParameterError(
        `❌ Responda a um GIF ou vídeo!\n\nUso: ${PREFIX}set-gif-bv7`
      );
    }

    await sendWaitReact();

    const gifsDir = path.join(ASSETS_DIR, "gifs");
    if (!fs.existsSync(gifsDir)) {
      fs.mkdirSync(gifsDir, { recursive: true });
    }

    const gifFileName = `welcome7-${remoteJid.split("@")[0]}.mp4`;
    const gifPath = path.join(gifsDir, gifFileName);

    if (fs.existsSync(gifPath)) {
      fs.unlinkSync(gifPath);
    }

    const downloadedPath = await downloadVideo(webMessage, gifFileName);

    if (downloadedPath !== gifPath) {
      fs.renameSync(downloadedPath, gifPath);
    }

    await setWelcome7Gif(remoteJid, gifPath);

    await sendSuccessReply(
      `✅ GIF configurado!\n\n` +
        `🎵 Configure áudio: ${PREFIX}set-audio-bv7 (responder áudio)\n` +
        `📝 Legenda: ${PREFIX}legenda-bv7 <texto>`
    );
  },
};