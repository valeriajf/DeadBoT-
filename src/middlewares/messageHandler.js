/**
 * Validador de mensagens + roteamento de comandos
 *
 * @author VaL
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

// Lista de figurinhas que disparam o tagall (use o get-sticker)
const STICKER_TRIGGER_IDS = [
  "76,72,24,62,30,139,219,98,160,7,65,182,215,206,117,253,211,226,111,227,189,88,177,101,203,36,53,5,166,28,11,93",
  
  "108,172,102,174,247,191,102,11,86,152,243,95,186,141,57,209,187,2,198,148,15,1,246,41,198,226,50,249,134,224,65,226",
  
  "117,19,109,80,152,71,11,90,28,199,161,216,120,17,168,17,251,63,51,0,66,98,187,66,177,201,67,160,153,144,67,171",
  
];

async function handleStickerTrigger(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const buf = webMessage.message.stickerMessage.fileSha256;
    const stickerIdNumeric = Array.from(buf).join(",");


    if (!STICKER_TRIGGER_IDS.includes(stickerIdNumeric)) {
      return;
    }

    // Pega informações do grupo
    const metadata = await socket.groupMetadata(webMessage.key.remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    // Verifica se quem enviou é ADM ou SUPERADM
    if (!participant?.admin) {
      console.log("❌ Figurinha enviada por não-ADM, ignorando");
      return;
    }

    console.log("✅ Figurinha reconhecida por ADM, disparando @all");

    const participants = metadata.participants.map(p => p.id);
    let mentionsText = "📢 *Marcação Geral*\n\n";
    mentionsText += participants.map(p => `@${p.split("@")[0]}`).join(" ");

    // Envia apenas a mensagem com @all, sem reenviar a figurinha
    await socket.sendMessage(webMessage.key.remoteJid, {
      text: mentionsText,
      mentions: participants
    }, { quoted: webMessage });

  } catch (e) {
    console.error("Erro no handleStickerTrigger:", e);
  }
}

exports.messageHandler = async (socket, webMessage) => {
  try {
    if (!webMessage?.key) return;

    const { remoteJid, fromMe, id: messageId } = webMessage.key;
    if (fromMe) return;

    const userJid = webMessage.key?.participant;
    if (!userJid) return;

    const isBotOrOwner =
      compareUserJidWithOtherNumber({ userJid, otherNumber: OWNER_NUMBER }) ||
      compareUserJidWithOtherNumber({ userJid, otherNumber: BOT_NUMBER }) ||
      userJid === OWNER_LID;

    if (isBotOrOwner) return;

    // 🔥 Checa se a figurinha é o gatilho do tagall (somente ADM)
    await handleStickerTrigger(socket, webMessage);

    // === Roteamento de comandos com prefixo "#"
    const textMessage =
      webMessage.message?.extendedTextMessage?.text ||
      webMessage.message?.conversation ||
      "";

    if (textMessage.startsWith("#")) {
      const parts = textMessage.trim().split(/\s+/);
      const command = parts[0].substring(1).toLowerCase();
      const args = parts.slice(1);

      if (command === "afk") return afk.handle(webMessage, { socket, args });
      if (command === "voltei") return voltei.handle(webMessage, { socket, args });
    }

    // === Anti-grupo (restrições de tipos de mensagem)
    const antiGroups = readGroupRestrictions();
    const messageType = Object.keys(readRestrictedMessageTypes()).find(type =>
      getContent(webMessage, type)
    );
    if (!messageType) return;

    const isAntiActive = !!antiGroups[remoteJid]?.[`anti-${messageType}`];
    if (!isAntiActive) return;

    await socket.sendMessage(remoteJid, {
      delete: {
        remoteJid,
        fromMe,
        id: messageId,
        participant: userJid,
      },
    });

  } catch (error) {
    errorLog(`Erro ao processar mensagem restrita ou comando. Detalhes: ${error.message}`);
  }
};