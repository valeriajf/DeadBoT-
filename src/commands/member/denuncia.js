const { PREFIX } = require(`${BASE_DIR}/config`);
const { InvalidParameterError } = require(`${BASE_DIR}/errors`);

module.exports = {
  name: "denuncia",
  description: "Envia uma denúncia aos administradores do grupo",
  commands: ["denuncia", "denunciar", "reportar"],
  usage: `${PREFIX}denuncia @usuário / motivo da denúncia`,
  category: "member",

  handle: async ({
    socket,
    args,
    sendSuccessReact,
    getGroupAdmins,
    getGroupParticipants,
    remoteJid,
    userJid,
    isGroup,
    webMessage,
  }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Este comando só funciona em grupos!");
    }

    if (!args.length || args.length < 2) {
      throw new InvalidParameterError(
        `❌ *Uso incorreto!*\n\n` +
        `📌 *Formato:* ${PREFIX}denuncia @usuário / motivo\n\n` +
        `💡 *Exemplo:*\n${PREFIX}denuncia @5511999999999 / enviando spam`
      );
    }

    const [infractorArg, ...motivoParts] = args;
    const motivo = motivoParts.join(" / ").trim();

    if (!motivo) {
      throw new InvalidParameterError(
        "❌ Você precisa informar o motivo da denúncia!"
      );
    }

    let infractorJid;
    const mentionedJids =
      webMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (mentionedJids.length > 0) {
      infractorJid = mentionedJids[0];
    } else {
      const numbersOnly = infractorArg.replace(/\D/g, "");

      if (!numbersOnly) {
        throw new InvalidParameterError(
          "❌ Número do usuário inválido! Mencione o usuário com @ ou use o número completo."
        );
      }

      const participants = await getGroupParticipants(remoteJid);

      // ✅ CORREÇÃO: suporta tanto objetos quanto strings
      const found = participants.find((p) => {
        const id = typeof p === "object" ? (p.id || p.jid || "") : p;
        return typeof id === "string" && id.includes(numbersOnly);
      });

      if (found) {
        infractorJid =
          typeof found === "object" ? (found.id || found.jid) : found;
      } else {
        infractorJid = `${numbersOnly}@s.whatsapp.net`;
      }
    }

    const admins = await getGroupAdmins(remoteJid);

    if (!admins || admins.length === 0) {
      throw new InvalidParameterError(
        "❌ Não foi possível obter a lista de administradores!"
      );
    }

    await sendSuccessReact();

    const adminMentions = admins.map((admin) => `@${admin.split("@")[0]}`);
    const infractorNumber = infractorJid.split("@")[0];

    const denunciaMsg =
      `🚨 *NOVA DENÚNCIA RECEBIDA* 🚨\n\n` +
      `👤 *Denunciado:* @${infractorNumber}\n` +
      `📝 *Motivo:* ${motivo}\n` +
      `👮 *Denunciante:* @${userJid.split("@")[0]}\n\n` +
      `⚠️ *Administradores, verifiquem esta denúncia:*\n` +
      `${adminMentions.join(" ")}`;

    const allMentions = [infractorJid, userJid, ...admins];

    await socket.sendMessage(remoteJid, {
      text: denunciaMsg,
      mentions: allMentions,
    });
  },
};