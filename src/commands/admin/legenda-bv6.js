const { InvalidParameterError } = require(`${BASE_DIR}/errors`);
const { PREFIX } = require(`${BASE_DIR}/config`);
const { setWelcome6Caption } = require(`${BASE_DIR}/utils/database`);

module.exports = {
  name: "legenda-bv6",
  description: "Define a legenda do vídeo de boas-vindas",
  commands: ["legenda-bv6"],
  usage: `${PREFIX}legenda-bv6 <texto>`,
  handle: async ({ args, isGroup, remoteJid, sendSuccessReply, fullArgs }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Somente em grupos!");
    }

    if (!args.length) {
      throw new InvalidParameterError(
        `❌ Forneça um texto!\n\n` +
          `Uso: ${PREFIX}legenda-bv6 Bem-vindo {membro} ao {grupo}!\n\n` +
          `📋 Placeholders disponíveis:\n` +
          `• {membro} ou @member - Menciona o membro\n` +
          `• {grupo} ou @group - Nome do grupo\n\n` +
          `💡 Use o formato que preferir!`
      );
    }

    const caption = fullArgs.trim();
    await setWelcome6Caption(remoteJid, caption);

    // Criar preview com todos os formatos
    const preview = caption
      // Formato {membro} e {grupo}
      .replace(/{membro}/gi, "@usuario")
      .replace(/{grupo}/gi, "Nome do Grupo")
      // Formato @member e @group
      .replace(/@member/gi, "@usuario")
      .replace(/@group/gi, "Nome do Grupo")
      // Formato [membro] e [grupo]
      .replace(/\[membro\]/gi, "@usuario")
      .replace(/\[grupo\]/gi, "Nome do Grupo")
      // Formato {{membro}} e {{grupo}}
      .replace(/{{membro}}/gi, "@usuario")
      .replace(/{{grupo}}/gi, "Nome do Grupo");

    await sendSuccessReply(
      `✅ Legenda configurada!\n\n` +
        `📝 Preview:\n${preview}\n\n` +
        `💡 Placeholders suportados:\n` +
        `• {membro} @member [membro] {{membro}}\n` +
        `• {grupo} @group [grupo] {{grupo}}`
    );
  },
};