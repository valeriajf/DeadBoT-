const { PREFIX, TEMP_DIR } = require(`${BASE_DIR}/config`);
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { getRandomNumber } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "to-gif",
  description: "Converte figurinhas animadas em MP4/GIF",
  commands: ["to-gif", "togif", "stkgif"],
  usage: `${PREFIX}to-gif (responda a figurinha animada)`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    isSticker,
    webMessage,
    downloadSticker,
    sendWaitReact,
    sendSuccessReact,
    sendVideoFromFile,
  }) => {
    if (!isSticker) {
      throw new InvalidParameterError("Você precisa enviar uma figurinha!");
    }

    // Detecta se a figurinha é animada
    const isAnimatedSticker = !!webMessage?.message?.stickerMessage?.isAnimated;

    if (!isAnimatedSticker) {
      throw new InvalidParameterError("A figurinha precisa ser animada!");
    }

    await sendWaitReact();

    const inputWebp = await downloadSticker(webMessage, "input");
    const outputMp4 = path.resolve(
      TEMP_DIR,
      `${getRandomNumber(10000, 99999)}.mp4`
    );

    try {
      // Converter para MP4 mantendo animação
      await new Promise((resolve, reject) => {
        exec(
          `ffmpeg -y -i "${inputWebp}" -movflags faststart -pix_fmt yuv420p "${outputMp4}"`,
          (err, stdout, stderr) => {
            if (err) return reject(new Error("Falha ao converter figurinha animada: " + stderr));
            resolve(stdout);
          }
        );
      });

      await sendSuccessReact();
      await sendVideoFromFile(outputMp4);

    } finally {
      // Limpeza dos arquivos temporários
      fs.rmSync(inputWebp, { force: true });
      fs.rmSync(outputMp4, { force: true });
    }
  },
};