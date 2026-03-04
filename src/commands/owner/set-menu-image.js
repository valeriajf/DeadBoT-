const fs = require("node:fs");
const path = require("node:path");
const { errorLog } = require(`${BASE_DIR}/utils/logger`);
const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "set-menu-image",
  description: "Altera a imagem do menu do bot",
  commands: [
    "set-menu-image",
    "set-image",
    "set-imagem-menu",
    "set-img-menu",
    "set-menu-imagem",
    "set-menu-img",
  ],
  usage: `${PREFIX}set-menu-image (responda a uma imagem)`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    isImage,
    isReply,
    downloadImage,
    sendSuccessReply,
    sendErrorReply,
    webMessage,
  }) => {
    if (!isReply || !isImage) {
      throw new InvalidParameterError(
        "Você precisa responder a uma mensagem que contenha uma imagem!"
      );
    }

    try {
      const imagesPath = path.join(ASSETS_DIR, "images");
      const menuImagePath = path.join(imagesPath, "takeshi-bot.png");

      // Remove o GIF se existir para evitar conflito
      const gifPath = path.join(imagesPath, "takeshi-bot.gif");
      if (fs.existsSync(gifPath)) {
        const gifBackupPath = path.join(imagesPath, "takeshi-bot-backup.gif");
        fs.copyFileSync(gifPath, gifBackupPath);
        fs.unlinkSync(gifPath);
      }

      // Backup da imagem anterior se existir
      if (fs.existsSync(menuImagePath)) {
        const backupPath = path.join(imagesPath, "takeshi-bot-backup.png");
        fs.copyFileSync(menuImagePath, backupPath);
        fs.unlinkSync(menuImagePath);
      }

      const tempPath = await downloadImage(webMessage, "new-menu-image-temp");

      fs.copyFileSync(tempPath, menuImagePath);
      fs.unlinkSync(tempPath);

      await sendSuccessReply("Imagem do menu atualizada com sucesso!");
    } catch (error) {
      errorLog(`Erro ao alterar imagem do menu: ${error}`);
      await sendErrorReply(
        "Ocorreu um erro ao tentar alterar a imagem do menu. Por favor, tente novamente."
      );
    }
  },
};