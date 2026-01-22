const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX } = require(`${BASE_DIR}/config`);
const { setWelcome7Caption } = require(`${BASE_DIR}/utils/database`);

module.exports = {
  name: "legenda-bv7",
  description: "Define a legenda do GIF de boas-vindas",
  commands: ["legenda-bv7"],
  usage: `${PREFIX}legenda-bv7 <texto>`,
  handle: async ({ args, isGroup, remoteJid, sendSuccessReply, fullArgs }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Somente em grupos!");
    }

    if (!args.length) {
      throw new InvalidParameterError(
        `❌ Forneça um texto!\n\n` +
          `Uso: ${PREFIX}legenda-bv7 Bem-vindo {membro} ao {grupo}!\n\n` +
          `📋 Placeholders disponíveis:\n` +
          `• {membro} ou @member - Menciona o membro\n` +
          `• {grupo} ou @group - Nome do grupo\n\n` +
          `💡 Use o formato que preferir!`
      );
    }

    const caption = fullArgs.trim();
    await setWelcome7Caption(remoteJid, caption);

    const preview = caption
      .replace(/{membro}/gi, "@usuario")
      .replace(/{grupo}/gi, "Nome do Grupo")
      .replace(/@member/gi, "@usuario")
      .replace(/@group/gi, "Nome do Grupo")
      .replace(/\[membro\]/gi, "@usuario")
      .replace(/\[grupo\]/gi, "Nome do Grupo")
      .replace(/{{membro}}/gi, "@usuario")
      .replace(/{{grupo}}/gi, "Nome do Grupo");

    await sendSuccessReply(
      `✅ Legenda configurada!\n\n` +
        `📝 Preview:\n${preview}\n\n` +
        `💡 Esta legenda aparecerá no GIF`
    );
  },
};