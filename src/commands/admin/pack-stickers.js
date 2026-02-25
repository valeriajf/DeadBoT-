const fs = require("fs");
const path = require("node:path");
const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { DangerError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "pack-stickers",
  description: "Envia figurinhas de um pack ou lista os packs disponíveis (somente admins)",
  commands: ["pack-stickers", "pack"],
  usage: `${PREFIX}pack nome-do-pack | ${PREFIX}pack list`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    isGroup,
    sendWaitReply,
    sendReply,
    sendStickerFromURL,
    sendReact,
  }) => {

    if (!isGroup) {
      throw new DangerError("Este comando só pode ser usado em grupos.");
    }

    const basePath = path.resolve(ASSETS_DIR, "stickers");

    const folders = fs
      .readdirSync(basePath)
      .filter(folder =>
        fs.statSync(path.join(basePath, folder)).isDirectory()
      );

    if (!args || !args.length) {
      throw new DangerError(
        `Use:\n${PREFIX}pack list\n${PREFIX}pack nome-do-pack`
      );
    }

    const inputName = args.join(" ").toLowerCase();

    // 🔹 LISTAR PACKS
    if (inputName === "list" || inputName === "lista") {
      if (!folders.length) {
        return sendReply("❌ Nenhum pack encontrado.");
      }

      await sendReact("📦");

      return sendReply(
        `📦 *Packs disponíveis:*\n\n` +
        folders.map(folder => `• ${folder}`).join("\n")
      );
    }

    // 🔹 ENVIAR PACK
    const matchedFolder = folders.find(
      folder => folder.toLowerCase() === inputName
    );

    if (!matchedFolder) {
      throw new DangerError("Pack não encontrado. Use #pack list para ver os disponíveis.");
    }

    const packPath = path.resolve(basePath, matchedFolder);

    const files = fs
      .readdirSync(packPath)
      .filter(file => file.toLowerCase().endsWith(".webp"));

    if (!files.length) {
      throw new DangerError("Esse pack não possui figurinhas .webp.");
    }

    await sendWaitReply(`📦 Enviando pack: ${matchedFolder}...`);

    for (const file of files) {
      await sendStickerFromURL(
        path.resolve(packPath, file)
      );
    }

    await sendReact("✅");
  },
};