const fs = require("fs");
const path = require("path");
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);

// ✅ CORRIGIDO: salva direto no JSON do src/database/ igual ao handler
const WELCOME7_DB_PATH = path.join(__dirname, '..', '..', 'database', 'welcome7.json');

function loadWelcome7Data() {
  try {
    if (fs.existsSync(WELCOME7_DB_PATH)) return JSON.parse(fs.readFileSync(WELCOME7_DB_PATH, 'utf8'));
    return {};
  } catch { return {}; }
}

function saveWelcome7Data(data) {
  try {
    const dbDir = path.dirname(WELCOME7_DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(WELCOME7_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function setWelcome7Audio(groupId, audioPath) {
  const data = loadWelcome7Data();
  if (!data[groupId]) data[groupId] = {};
  data[groupId].audioPath = audioPath;
  saveWelcome7Data(data);
}

module.exports = {
  name: "set-audio-bv7",
  description: "Define o áudio de boas-vindas do grupo",
  commands: ["set-audio-bv7"],
  usage: `${PREFIX}set-audio-bv7 (responder áudio)`,
  handle: async ({
    isGroup,
    isReply,
    isAudio,
    remoteJid,
    downloadAudio,
    webMessage,
    sendSuccessReply,
    sendWaitReact,
  }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Somente em grupos!");
    }

    if (!isReply || !isAudio) {
      throw new InvalidParameterError(
        `❌ Responda a um áudio!\n\nUso: ${PREFIX}set-audio-bv7`
      );
    }

    await sendWaitReact();

    const audiosDir = path.join(ASSETS_DIR, "audios");
    if (!fs.existsSync(audiosDir)) {
      fs.mkdirSync(audiosDir, { recursive: true });
    }

    const audioFileName = `welcome7-${remoteJid.split("@")[0]}.mp3`;
    const audioPath = path.join(audiosDir, audioFileName);

    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }

    const downloadedPath = await downloadAudio(webMessage, audioFileName);

    if (downloadedPath !== audioPath) {
      fs.renameSync(downloadedPath, audioPath);
    }

    setWelcome7Audio(remoteJid, audioPath);

    await sendSuccessReply(
      `✅ Áudio configurado!\n\n` +
        `📝 Configure legenda: ${PREFIX}legenda-bv7 <texto>`
    );
  },
};
