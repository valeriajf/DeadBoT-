const fs = require("fs");
const path = require("path");
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);

// ✅ CORRIGIDO: salva direto no JSON do src/database/ igual ao handler
const WELCOME6_DB_PATH = path.join(__dirname, '..', '..', 'database', 'welcome6.json');

function loadWelcome6Data() {
  try {
    if (fs.existsSync(WELCOME6_DB_PATH)) return JSON.parse(fs.readFileSync(WELCOME6_DB_PATH, 'utf8'));
    return {};
  } catch { return {}; }
}

function saveWelcome6Data(data) {
  try {
    const dbDir = path.dirname(WELCOME6_DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(WELCOME6_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function setWelcome6Video(groupId, videoPath) {
  const data = loadWelcome6Data();
  if (!data[groupId]) data[groupId] = {};
  data[groupId].videoPath = videoPath;
  saveWelcome6Data(data);
}

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

    setWelcome6Video(remoteJid, videoPath);

    await sendSuccessReply(
      `✅ Vídeo configurado!\n\n` +
        `📝 Configure legenda: ${PREFIX}legenda-bv6 <texto>`
    );
  },
};
