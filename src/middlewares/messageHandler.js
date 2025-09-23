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
  "43,46,102,183,89,239,206,183,239,147,203,90,68,28,221,134,8,239,153,64,123,98,118,217,133,160,176,51,110,31,157,140",
  
  "89,80,39,239,31,129,88,22,116,149,128,138,157,24,73,25,45,173,47,249,110,102,88,83,4,236,213,143,155,81,185,176",
  
  "58,52,25,195,122,35,198,6,239,141,184,135,220,13,134,46,211,191,79,108,251,213,149,78,35,126,213,253,40,149,36,22",
  
  "121,208,5,94,213,43,71,141,147,217,89,88,50,235,108,203,45,151,174,31,9,159,174,109,229,51,208,54,128,3,236,3",
  
  "242,31,246,101,48,192,7,93,107,25,111,164,232,246,155,135,120,213,79,109,17,160,151,136,124,60,102,85,161,149,225,190",
  
  "194,227,129,164,75,151,60,42,235,31,45,165,249,245,35,93,26,95,83,114,119,157,194,79,111,52,106,160,156,192,235,138",
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