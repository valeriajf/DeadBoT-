const path = require("path");
const fs = require("fs");
const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { menuMessage } = require(`${BASE_DIR}/menu`);

module.exports = {
  name: "menu",
  description: "Menu de comandos",
  commands: ["menu", "help"],
  usage: `${PREFIX}menu`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ sendImageFromFile, sendGifFromFile, sendSuccessReact }) => {
    await sendSuccessReact();

    const menuBasePath = path.join(ASSETS_DIR, "images");
    const files = fs.readdirSync(menuBasePath).filter((f) =>
      f.startsWith("takeshi-bot") && !f.includes("backup")
    );

    // Prioriza GIF/MP4, fallback para imagem estática
    const menuFileName =
      files.find((f) => /\.(gif|mp4)$/i.test(f)) ||
      files.find((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));

    if (!menuFileName) {
      throw new Error("Arquivo de menu não encontrado.");
    }

    const fullPath = path.join(menuBasePath, menuFileName);
    const isGifOrMp4 = /\.(gif|mp4)$/i.test(menuFileName);
    const caption = `\n\n${menuMessage()}`;

    if (isGifOrMp4) {
      await sendGifFromFile(fullPath, caption);
    } else {
      await sendImageFromFile(fullPath, caption);
    }
  },
};