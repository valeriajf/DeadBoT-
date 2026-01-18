const { setPrefix } = require(`${BASE_DIR}/utils/database`);

const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "set-prefix",
  description: "Mudo o prefixo de uso dos meus comandos",
  commands: [
    "set-prefix",
    "altera-prefix",
    "altera-prefixo",
    "alterar-prefix",
    "alterar-prefixo",
    "muda-prefix",
    "muda-prefixo",
    "mudar-prefix",
    "mudar-prefixo",
    "set-prefixo",
  ],
  usage: `${PREFIX}set-prefix /`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ remoteJid, args, sendSuccessReply, fullArgs }) => {
    // Tenta pegar de args primeiro, depois de fullArgs se disponível
    const input = args.length ? args.join(' ') : (fullArgs || '');
    
    const newPrefix = input.trim();

    if (!newPrefix) {
      throw new InvalidParameterError("Você deve fornecer um prefixo! Exemplo: #set-prefix /");
    }

    if (newPrefix.length > 1) {
      throw new InvalidParameterError("O prefixo deve ser apenas 1 caractere!");
    }

    await setPrefix(remoteJid, newPrefix);

    await sendSuccessReply(`Prefixo alterado para: ${newPrefix} neste grupo!`);
  },
};