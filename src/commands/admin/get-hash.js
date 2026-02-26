const { PREFIX } = require(`${BASE_DIR}/config`);
const { DangerError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "get-hash",
  description: "Obtém o hash (fileSha256) de uma figurinha respondida (somente admins)",
  commands: ["get-hash"],
  usage: `${PREFIX}get-hash (respondendo uma figurinha)`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    webMessage,
    sendReply,
    sendReact,
  }) => {

    const quoted =
      webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted || !quoted.stickerMessage) {
      throw new DangerError(
        `Responda a uma figurinha para obter o hash.\n\nExemplo:\n1️⃣ Responda a figurinha\n2️⃣ Use ${PREFIX}get-hash`
      );
    }

    const sticker = quoted.stickerMessage;

    const hashBuffer = sticker.fileSha256;

    if (!hashBuffer) {
      throw new DangerError("Não foi possível obter o hash da figurinha.");
    }

    const hashBase64 = Buffer.from(hashBuffer).toString("base64");

    await sendReact("🔎");

    return sendReply(
      `🧩 *Hash da figurinha:*\n\n${hashBase64}`
    );
  },
};