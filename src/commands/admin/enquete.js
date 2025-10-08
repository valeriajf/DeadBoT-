/**
 * Comando de enquete com marcação - Cria enquetes nativas do WhatsApp marcando todos
 * 
 * Permite criar votações interativas com até 12 opções e marca todos os membros do grupo
 * Uso: !enquete Pergunta/opção1/opção2/opção3
 * 
 * @author Dev VaL
 */
const { PREFIX } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "enquete",
  description: "Cria enquetes nativas do WhatsApp marcando todos do grupo",
  commands: ["poll", "enquete", "votacao", "voto"],
  usage: `${PREFIX}enquete Pergunta/opção1/opção2/opção3`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ 
    args,
    sendErrorReply,
    sendWarningReply,
    sendWaitReact,
    sendSuccessReact,
    sendText,
    socket,
    remoteJid,
    webMessage
  }) => {
    try {
      // Extrai o texto da mensagem
      let userInput = webMessage.message?.conversation || 
                     webMessage.message?.extendedTextMessage?.text || 
                     args.join(" ");

      await sendWaitReact();

      // Remove o comando do texto
      userInput = userInput.replace(`${PREFIX}enquete`, "")
                          .replace(`${PREFIX}poll`, "")
                          .replace(`${PREFIX}voto`, "")
                          .replace(`${PREFIX}votacao`, "")
                          .trim();

      // Validação: verifica se há conteúdo e separador
      if (!userInput || !userInput.includes("/")) {
        return sendWarningReply(
          `❌ *Uso incorreto!*\n\n*Use:* ${this.usage}\n\n*Exemplo:*\n${PREFIX}enquete Qual a melhor linguagem?/JavaScript/Python/Java`
        );
      }

      // Separa pergunta e opções
      const params = userInput.split("/").map(param => param.trim());

      // Validação: mínimo de opções
      if (params.length < 3) {
        return sendWarningReply(
          "⚠️ Você precisa fornecer pelo menos *uma pergunta* e *duas opções*!\n\n" +
          `*Exemplo:* ${PREFIX}enquete Preferência?/Opção A/Opção B`
        );
      }

      // Validação: máximo de opções (WhatsApp limita a 12)
      if (params.length > 13) {
        return sendWarningReply(
          "⚠️ Número máximo de opções é *12*!\n\n" +
          "Reduza a quantidade de opções e tente novamente."
        );
      }

      const [question, ...options] = params;

      // Pega todos os participantes do grupo para mencionar
      const { participants } = await socket.groupMetadata(remoteJid);
      const mentions = participants.map(({ id }) => id);

      console.log(`📊 Criando enquete com ${mentions.length} menções`);

      // 🎯 PRIMEIRO: Envia mensagem marcando todos
      await sendText(`📢 *NOVA ENQUETE!* 📊\n\n⬇️ Vote na enquete abaixo! ⬇️`, mentions);

      // ⏱️ Pequeno delay para garantir que a mensagem seja enviada primeiro
      await new Promise(resolve => setTimeout(resolve, 500));

      // 🗳️ SEGUNDO: Envia a enquete
      const pollMessage = {
        poll: {
          name: question,
          values: options,
          selectableOptionsCount: 1
        }
      };

      await socket.sendMessage(remoteJid, pollMessage);

      console.log("✅ Enquete enviada com sucesso!");

      return sendSuccessReact();

    } catch (error) {
      console.error("❌ Erro ao criar enquete:", error);
      return sendErrorReply(
        "Erro ao criar enquete. Verifique se:\n\n" +
        "• O formato está correto\n" +
        "• Você usou `/` para separar as opções\n" +
        "• Tem entre 2 e 12 opções"
      );
    }
  },
};