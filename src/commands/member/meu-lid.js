const { PREFIX } = require("../../config");
const InvalidParameterError = require("../../errors/InvalidParameterError");
const { normalizeToLid } = require("../../utils");

module.exports = {
  name: "meu-lid",
  description: "Retorna o LID da pessoa",
  commands: ["meu-lid", "my-lid", "lid"],
  usage: `${PREFIX}meu-lid`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    sendSuccessReply,
    userJid,
    replyJid,
    socket,
    args,
  }) => {
    if (args.length) {
      throw new InvalidParameterError(`Não tem mais como por o número na frente.

Para pegar seu LID:

${PREFIX}meu-lid

Para ver o LID de outra pessoa ela tem que estar no grupo e
você responde com o comando:

${PREFIX}lid (em cima de qualquer mensagem dela)`);
    }

    // Se respondeu alguém → pega o LID dessa pessoa
    if (replyJid) {
      const lid = await normalizeToLid(socket, replyJid);
      await sendSuccessReply(`LID do contato mencionado: ${lid}`);
      return;
    }

    // Caso contrário → pega o seu próprio LID
    const lid = await normalizeToLid(socket, userJid);
    await sendSuccessReply(`Seu LID: ${lid}`);
  },
};