const { OWNER_NUMBER } = require("../../config");
const { PREFIX, BOT_NUMBER } = require(`${BASE_DIR}/config`);
const { DangerError, InvalidParameterError, WarningError } = require(`${BASE_DIR}/errors`);
const { toUserJid, onlyNumbers } = require(`${BASE_DIR}/utils`);

module.exports = {
  name: "ban",
  description: "Removo um membro do grupo",
  commands: ["ban", "dracarys"],
  usage: `${PREFIX}ban @marcar_membro 
  
ou 

${PREFIX}ban (mencionando uma mensagem)`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({
    args,
    isReply,
    socket,
    remoteJid,
    replyJid,
    userJid,
    isLid,
    quoted,
    text,
    sendReply,
    sendSuccessReact,
  }) => {
    // 🧪 Diagnóstico: logar dados para entender por que o emoji não está funcionando
    console.log("👉 Texto da mensagem:", text);
    console.log("👉 Objeto quoted:", quoted);

    let memberToRemoveId = null;

    // 🧠 Checa se é uma mensagem com apenas o emoji ☠️ e está respondendo alguém
    const isEmojiBan = text?.trim() === "☠️" && isReply && quoted?.participant;

    if (isEmojiBan) {
      const targetJid = quoted.participant;
      const targetNumber = onlyNumbers(targetJid);

      if (targetJid === userJid) {
        throw new DangerError("Você não pode remover você mesmo!");
      }

      if (targetNumber === OWNER_NUMBER) {
        throw new DangerError("Você não pode remover o dono do bot!");
      }

      const botJid = toUserJid(BOT_NUMBER);

      if (targetJid === botJid) {
        throw new DangerError("Você não pode me remover!");
      }

      memberToRemoveId = targetJid;
    } else {
      // ⚠️ Fluxo normal do comando com menção ou número
      if (!args.length && !isReply) {
        throw new InvalidParameterError(
          "Você precisa mencionar ou marcar um membro!"
        );
      }

      if (isLid) {
        const [result] = await socket.onWhatsApp(onlyNumbers(args[0]));

        if (!result) {
          throw new WarningError(
            "O número informado não está registrado no WhatsApp!"
          );
        }

        memberToRemoveId = result.lid;
      } else {
        const memberToRemoveJid = isReply ? replyJid : toUserJid(args[0]);
        const memberToRemoveNumber = onlyNumbers(memberToRemoveJid);

        if (
          memberToRemoveNumber.length < 7 ||
          memberToRemoveNumber.length > 15
        ) {
          throw new InvalidParameterError("Número inválido!");
        }

        if (memberToRemoveJid === userJid) {
          throw new DangerError("Você não pode remover você mesmo!");
        }

        if (memberToRemoveNumber === OWNER_NUMBER) {
          throw new DangerError("Você não pode remover o dono do bot!");
        }

        const botJid = toUserJid(BOT_NUMBER);

        if (memberToRemoveJid === botJid) {
          throw new DangerError("Você não pode me remover!");
        }

        memberToRemoveId = memberToRemoveJid;
      }
    }

    await socket.groupParticipantsUpdate(remoteJid, [memberToRemoveId], "remove");

    await sendSuccessReact();
    await sendReply("Membro removido com sucesso!");
  },
};