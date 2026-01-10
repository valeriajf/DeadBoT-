const fs = require("fs/promises");
const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { toGif } = require(`${BASE_DIR}/services/spider-x-api`);
const { getRandomName } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "togif",
  description: "Transformo figurinhas animadas em GIF",
  commands: ["togif", "gif"],
  usage: `${PREFIX}togif (marque a figurinha)`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    isSticker,
    downloadSticker,
    webMessage,
    sendWaitReact,
    sendSuccessReact,
    sendGifFromURL,
  }) => {
    if (!isSticker) {
      throw new InvalidParameterError("Você precisa enviar uma figurinha!");
    }

    await sendWaitReact();

    const stickerPath = await downloadSticker(webMessage, getRandomName());

    const stickerBuffer = await fs.readFile(stickerPath);

    const gifUrl = await toGif(stickerBuffer);

    await sendSuccessReact();

    await sendGifFromURL(gifUrl);
  },
};