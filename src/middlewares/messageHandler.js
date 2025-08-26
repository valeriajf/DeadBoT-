/**
 * Validador de mensagens + roteamento de comandos
 *
 * @author MRX
 */
const { getContent, compareUserJidWithOtherNumber } = require("../utils");
const { errorLog } = require("../utils/logger");
const {
  readGroupRestrictions,
  readRestrictedMessageTypes,
} = require("../utils/database");
const { BOT_NUMBER, OWNER_NUMBER, OWNER_LID } = require("../config");

// Importa comandos AFK
const afk = require("../commands/member/afk");
const voltei = require("../commands/member/voltei");

exports.messageHandler = async (socket, webMessage) => {
  try {
    if (!webMessage?.key) {
      return;
    }

    const { remoteJid, fromMe, id: messageId } = webMessage.key;

    if (fromMe) {
      return;
    }

    const userJid = webMessage.key?.participant;

    if (!userJid) {
      return;
    }

    const isBotOrOwner =
      compareUserJidWithOtherNumber({ userJid, otherNumber: OWNER_NUMBER }) ||
      compareUserJidWithOtherNumber({ userJid, otherNumber: BOT_NUMBER }) ||
      userJid === OWNER_LID;

    if (isBotOrOwner) {
      return;
    }

    // === Roteamento de comandos com prefixo "#"
    const textMessage =
      webMessage.message?.extendedTextMessage?.text ||
      webMessage.message?.conversation ||
      "";

    if (textMessage.startsWith("#")) {
      const parts = textMessage.trim().split(/\s+/);
      const command = parts[0].substring(1).toLowerCase(); // remove o "#"
      const args = parts.slice(1);

      if (command === "afk") {
        return afk.handle(webMessage, { socket, args });
      }
      if (command === "voltei") {
        return voltei.handle(webMessage, { socket, args });
      }
    }
    // === Fim do roteamento de comandos

    // === Anti-grupo (restrições de tipos de mensagem)
    const antiGroups = readGroupRestrictions();

    const messageType = Object.keys(readRestrictedMessageTypes()).find((type) =>
      getContent(webMessage, type)
    );

    if (!messageType) {
      return;
    }

    const isAntiActive = !!antiGroups[remoteJid]?.[`anti-${messageType}`];

    if (!isAntiActive) {
      return;
    }

    await socket.sendMessage(remoteJid, {
      delete: {
        remoteJid,
        fromMe,
        id: messageId,
        participant: userJid,
      },
    });
  } catch (error) {
    errorLog(
      `Erro ao processar mensagem restrita ou comando. Detalhes: ${error.message}`
    );
  }
};