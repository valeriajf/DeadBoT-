/*
Envia um aviso em todos os grupos em que o bot esta

By vøidh7

*/

const { errorLog } = require(`${BASE_DIR}/utils/logger`);
const { PREFIX, OWNER_JID } = require(`${BASE_DIR}/config`);

module.exports = {
  name: "aviso-geral",
  description: "Dono envia mensagem em todos os grupos com menção a todos",
  commands: ["aviso-geral"],
  usage: `${PREFIX}aviso-geral <mensagem>`,
  handle: async ({
    socket,
    sendReact,
    sendReply,
    sendErrorReply,
    args,
    sender,
  }) => {
    try {
      // Apenas dono pode usar
      if (sender !== OWNER_JID) {
        return sendErrorReply("❌ apenas o meu supremo mestre pode usar esse comando");
      }

      if (!args.length) {
        return sendErrorReply(`Uso: ${PREFIX}aviso-geral <mensagem>`);
      }

      const message = args.join(" ");
      const groupsMeta = await socket.groupFetchAllParticipating();
      const groups = Object.values(groupsMeta);

      for (const group of groups) {
        try {
          const members = group.participants.map(p => p.id);

          await socket.sendMessage(group.id, {
            text: message,
            mentions: members,
          });
        } catch (e) {
          errorLog(e);
        }
      }

      await sendReact("📢");
      await sendReply("Mensagem enviada em todos os grupos ✅");
    } catch (error) {
      errorLog(error);
      await sendErrorReply("Erro ao enviar aviso ❌");
    }
  },
};