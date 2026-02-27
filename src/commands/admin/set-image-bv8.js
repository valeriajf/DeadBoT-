const fs = require("fs");
const path = require("path");
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);

const WELCOME8_DB_PATH = path.join(__dirname, '..', '..', 'database', 'welcome8.json');

function loadWelcome8Data() {
  try {
    if (fs.existsSync(WELCOME8_DB_PATH)) return JSON.parse(fs.readFileSync(WELCOME8_DB_PATH, 'utf8'));
    return {};
  } catch { return {}; }
}

function saveWelcome8Data(data) {
  try {
    const dbDir = path.dirname(WELCOME8_DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(WELCOME8_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function setWelcome8Photo(groupId, photoPath) {
  const data = loadWelcome8Data();
  if (!data[groupId]) data[groupId] = {};
  data[groupId].photoPath = photoPath;
  saveWelcome8Data(data);
}

module.exports = {
  name: "set-img-bv8",
  description: "Define a foto de boas-vindas do grupo (escolhida pelo ADM)",
  commands: ["set-img-bv8"],
  usage: `${PREFIX}set-img-bv8 (responder imagem)`,
  handle: async ({
    isGroup,
    isReply,
    isImage,
    remoteJid,
    downloadImage,
    webMessage,
    sendSuccessReply,
    sendWaitReact,
  }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Somente em grupos!");
    }

    if (!isReply || !isImage) {
      throw new InvalidParameterError(
        `❌ Responda a uma imagem!\n\nUso: ${PREFIX}set-img-bv8`
      );
    }

    await sendWaitReact();

    const photosDir = path.join(ASSETS_DIR, "photos");
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true });
    }

    const photoFileName = `welcome8-${remoteJid.split("@")[0]}.jpg`;
    const photoPath = path.join(photosDir, photoFileName);

    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }

    const downloadedPath = await downloadImage(webMessage, photoFileName);

    if (downloadedPath !== photoPath) {
      fs.renameSync(downloadedPath, photoPath);
    }

    setWelcome8Photo(remoteJid, photoPath);

    await sendSuccessReply(
      `✅ Foto configurada com sucesso!\n\n` +
        `📝 Configure a legenda: ${PREFIX}legenda-bv8 <texto>\n` +
        `🔛 Ative o welcome: ${PREFIX}welcome8 1`
    );
  },
};
