const { errorLog } = require(`${BASE_DIR}/utils/logger`);
const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "set-nome-grupo",
  description: "Altera o nome do grupo e salva o nome antigo",
  commands: [
    "set-nome",
    "nome-grupo",
    "set-nome-grupo"
  ],
  usage: `${PREFIX}set-nome-grupo novo nome do grupo`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    fullArgs,
    remoteJid,
    socket,
    sendErrorReply,
    sendSuccessReply,
    isGroup,
    userJid,
  }) => {
    if (!isGroup) {
      throw new WarningError("Esse comando só pode ser usado em grupos.");
    }

    if (!fullArgs) {
      throw new InvalidParameterError(
        "Você precisa fornecer um novo nome para o grupo!"
      );
    }

    const minLength = 3;
    const maxLength = 40;

    if (fullArgs.length < minLength || fullArgs.length > maxLength) {
      throw new InvalidParameterError(
        `O nome do grupo deve ter entre ${minLength} e ${maxLength} caracteres!`
      );
    }

    try {
      const groupMetadata = await socket.groupMetadata(remoteJid);

      // 🔐 Verifica se quem executou é admin do grupo
      const participant = groupMetadata.participants.find(
        (p) => p.id === userJid
      );

      const isAdmin =
        participant?.admin === "admin" ||
        participant?.admin === "superadmin";

      if (!isAdmin) {
        throw new WarningError("❌ Erro! Você não tem permissão para executar este comando!");
      }

      const oldName = groupMetadata.subject;

      await socket.groupUpdateSubject(remoteJid, fullArgs);

      await sendSuccessReply(
        `Nome do grupo alterado com sucesso!\n\n*Antigo*: ${oldName}\n\n*Novo*: ${fullArgs}`
      );
    } catch (error) {
      errorLog("Erro ao alterar o nome do grupo:", error);
      await sendErrorReply("❌ Erro! Você não tem permissão para executar este comando!");
    }
  },
};