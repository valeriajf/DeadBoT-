const fs = require("node:fs");
const path = require("node:path");
const { errorLog } = require(`${BASE_DIR}/utils/logger`);
const { isBotOwner } = require(`${BASE_DIR}/middlewares`);
const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { download } = require(`${BASE_DIR}/utils`);
const { InvalidParameterError, DangerError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "set-menu-gif",
  description: "Altera o GIF do menu do bot (apenas owner)",
  commands: ["set-menu-gif", "set-gif-menu", "set-gif"],
  usage: `${PREFIX}set-menu-gif (responda a um GIF)`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    isReply,
    sendSuccessReply,
    sendErrorReply,
    webMessage,
    userJid,
  }) => {
    if (!isBotOwner({ userJid })) {
      throw new DangerError("Apenas o owner pode alterar o GIF do menu!");
    }

    const quotedMessage =
      webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    const isGif = !!quotedMessage?.videoMessage?.gifPlayback;

    if (!isReply || !isGif) {
      throw new InvalidParameterError(
        "Você precisa responder a uma mensagem que contenha um GIF!"
      );
    }

    try {
      const imagesPath = path.join(ASSETS_DIR, "images");
      const menuGifPath = path.join(imagesPath, "takeshi-bot.gif");

      // Remove a imagem PNG se existir para evitar conflito
      const pngPath = path.join(imagesPath, "takeshi-bot.png");
      if (fs.existsSync(pngPath)) {
        const pngBackupPath = path.join(imagesPath, "takeshi-bot-backup.png");
        fs.copyFileSync(pngPath, pngBackupPath);
        fs.unlinkSync(pngPath);
      }

      // Backup do GIF anterior se existir
      if (fs.existsSync(menuGifPath)) {
        const backupPath = path.join(imagesPath, "takeshi-bot-backup.gif");
        fs.copyFileSync(menuGifPath, backupPath);
        fs.unlinkSync(menuGifPath);
      }

      const quotedWebMessage = {
        key: {
          remoteJid: webMessage.key.remoteJid,
          id: webMessage.message.extendedTextMessage.contextInfo.stanzaId,
          participant:
            webMessage.message.extendedTextMessage.contextInfo.participant,
        },
        message: quotedMessage,
      };

      const tempPath = await download(
        quotedWebMessage,
        "new-menu-gif-temp",
        "video",
        "mp4"
      );

      fs.copyFileSync(tempPath, menuGifPath);
      fs.unlinkSync(tempPath);

      await sendSuccessReply("GIF do menu atualizado com sucesso!");
    } catch (error) {
      errorLog(`Erro ao alterar GIF do menu: ${error}`);
      await sendErrorReply(
        "Ocorreu um erro ao tentar alterar o GIF do menu. Por favor, tente novamente."
      );
    }
  },
};