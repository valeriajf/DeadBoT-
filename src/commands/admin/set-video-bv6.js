const fs = require("fs");
const path = require("path");
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { setWelcome6Video } = require(`${BASE_DIR}/utils/database`);

module.exports = {
  name: "set-video-bv6",
  description: "Define o vídeo de boas-vindas do grupo",
  commands: ["set-video-bv6"],
  usage: `${PREFIX}set-video-bv6 (responder vídeo)`,
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
        `❌ Responda a um vídeo!\n\nUso: ${PREFIX}set-video-bv6`
      );
    }

    await sendWaitReact();

    const videosDir = path.join(ASSETS_DIR, "videos");
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    const videoFileName = `welcome6-${remoteJid.split("@")[0]}.mp4`;
    const videoPath = path.join(videosDir, videoFileName);

    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    const downloadedPath = await downloadVideo(webMessage, videoFileName);

    if (downloadedPath !== videoPath) {
      fs.renameSync(downloadedPath, videoPath);
    }

    await setWelcome6Video(remoteJid, videoPath);

    await sendSuccessReply(
      `✅ Vídeo configurado!\n\n` +
        `📝 Configure legenda: ${PREFIX}legenda-bv6 <texto>`
    );
  },
};