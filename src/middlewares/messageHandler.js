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
  checkIfMemberIsMuted,
  muteMember,
  unmuteMember,
} = require("../utils/database");
const { BOT_NUMBER, OWNER_NUMBER, OWNER_LID } = require("../config");
const fs = require('fs');
const path = require('path');

// Importa comandos AFK
const afk = require("../commands/member/afk");
const voltei = require("../commands/member/voltei");

// Lista de figurinhas que disparam o tagall (use o get-sticker)
const STICKER_TRIGGER_IDS = [
  "55,228,193,145,9,157,220,70,93,2,80,169,59,3,226,160,3,67,63,3,212,55,45,222,19,228,51,154,84,130,37,50",
];

// Lista de figurinhas que deletam mensagens (use o get-sticker) - GLOBAL para todos os grupos
const STICKER_DELETE_IDS = [
  "16,115,187,157,108,244,163,167,150,93,60,215,218,51,92,149,43,107,120,57,5,117,129,120,128,170,228,32,1,70,59,61",
];

// Lista de figurinhas que dão advertência (use o get-sticker)
const STICKER_WARN_IDS = [
  "255,198,164,242,70,177,96,21,246,151,228,28,100,22,6,100,87,15,149,52,95,244,160,226,234,213,169,232,51,160,133,15",
  
  "118,241,161,38,38,225,155,187,29,20,224,18,55,113,180,249,156,233,179,230,147,11,138,15,240,185,155,210,78,119,135,131",
  
  "193,19,74,214,158,107,153,225,242,61,57,216,157,206,170,113,66,0,83,187,1,93,50,102,238,213,108,67,44,172,38,218"
];

// Lista de figurinhas que mutam usuários (use o get-sticker)
const STICKER_MUTE_IDS = [
  "69,148,108,127,91,47,253,91,121,79,9,189,37,245,99,205,48,29,211,47,183,162,88,235,110,27,255,205,29,100,43,92",
];

// Lista de figurinhas que desmutam usuários (use o get-sticker)
const STICKER_UNMUTE_IDS = [
  "144,135,209,13,225,158,253,24,180,169,221,127,22,140,83,132,14,235,191,220,10,19,185,244,24,77,65,134,226,187,228,195",
];

const warnsFile = path.join(__dirname, '../warns.json');

function readWarns() {
  if (!fs.existsSync(warnsFile)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(warnsFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveWarns(warns) {
  try {
    fs.writeFileSync(warnsFile, JSON.stringify(warns, null, 2));
  } catch (error) {
    console.error('Erro ao salvar warns:', error);
  }
}

function onlyNumbers(jid) {
  return jid.replace(/\D/g, '');
}

async function handleStickerTrigger(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const buf = webMessage.message.stickerMessage.fileSha256;
    const stickerIdNumeric = Array.from(buf).join(",");

    if (!STICKER_TRIGGER_IDS.includes(stickerIdNumeric)) {
      return;
    }

    const metadata = await socket.groupMetadata(webMessage.key.remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    if (!participant?.admin) {
      return;
    }

    const participants = metadata.participants.map(p => p.id);
    let mentionsText = "📢 *Marcação Geral*\n\n";
    mentionsText += participants.map(p => `@${p.split("@")[0]}`).join(" ");

    await socket.sendMessage(webMessage.key.remoteJid, {
      text: mentionsText,
      mentions: participants
    }, { quoted: webMessage });

  } catch (e) {
  }
}

async function handleStickerDelete(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const contextInfo = webMessage.message.stickerMessage.contextInfo;
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      return;
    }

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    if (!STICKER_DELETE_IDS.includes(numericId)) {
      return;
    }

    const metadata = await socket.groupMetadata(webMessage.key.remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    if (!participant?.admin) {
      return;
    }

    const { stanzaId, participant: targetParticipant } = contextInfo;
    const remoteJid = webMessage.key.remoteJid;
    
    await socket.sendMessage(remoteJid, {
      delete: {
        remoteJid,
        fromMe: false,
        id: stanzaId,
        participant: targetParticipant,
      },
    });
    
  } catch (error) {
  }
}

async function handleStickerWarn(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const contextInfo = webMessage.message.stickerMessage.contextInfo;
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      return;
    }

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    if (!STICKER_WARN_IDS.includes(numericId)) {
      return;
    }

    const metadata = await socket.groupMetadata(webMessage.key.remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    if (!participant?.admin) {
      return;
    }

    const targetJid = contextInfo.participant;
    const remoteJid = webMessage.key.remoteJid;

    let warns = readWarns();
    
    warns[targetJid] = (warns[targetJid] || 0) + 1;
    const count = warns[targetJid];

    saveWarns(warns);

    if (count >= 3) {
      await socket.sendMessage(remoteJid, {
        text: `🚫 @${targetJid.split('@')[0]} atingiu 3 advertências e será removido.`,
        mentions: [targetJid]
      });

      try {
        await socket.groupParticipantsUpdate(remoteJid, [targetJid], 'remove');
        
        warns[targetJid] = 0;
        saveWarns(warns);
      } catch (error) {
        await socket.sendMessage(remoteJid, { 
          text: '❌ Erro ao remover o usuário. O bot é administrador?' 
        });
      }
    } else {
      await socket.sendMessage(remoteJid, {
        text: `⚠️ @${targetJid.split('@')[0]} recebeu uma advertência.\n🔢 Total: ${count}/3`,
        mentions: [targetJid]
      });
    }

  } catch (error) {
  }
}

async function handleStickerMute(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const contextInfo = webMessage.message.stickerMessage.contextInfo;
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      return;
    }

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    if (!STICKER_MUTE_IDS.includes(numericId)) {
      return;
    }

    const metadata = await socket.groupMetadata(webMessage.key.remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    if (!participant?.admin) {
      return;
    }

    const targetJid = contextInfo.participant;
    const remoteJid = webMessage.key.remoteJid;
    const targetNumber = onlyNumbers(targetJid);

    if ([OWNER_NUMBER, OWNER_LID.replace("@lid", "")].includes(targetNumber)) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode mutar o dono do bot!',
      });
      return;
    }

    if (targetJid === `${BOT_NUMBER}@s.whatsapp.net`) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode mutar o bot.',
      });
      return;
    }

    const isTargetAdmin = metadata.participants.some(
      p => p.id === targetJid && p.admin
    );

    if (isTargetAdmin) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode mutar um administrador.',
      });
      return;
    }

    if (checkIfMemberIsMuted(remoteJid, targetJid)) {
      await socket.sendMessage(remoteJid, {
        text: `⚠️ @${targetNumber} já está mutado neste grupo.`,
        mentions: [targetJid]
      });
      return;
    }

    muteMember(remoteJid, targetJid);

    await socket.sendMessage(remoteJid, {
      text: `🔇 @${targetNumber} foi mutado com sucesso!\n\n_Suas mensagens serão deletadas automaticamente._`,
      mentions: [targetJid]
    });

  } catch (error) {
  }
}

async function handleStickerUnmute(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const contextInfo = webMessage.message.stickerMessage.contextInfo;
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      return;
    }

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    if (!STICKER_UNMUTE_IDS.includes(numericId)) {
      return;
    }

    const metadata = await socket.groupMetadata(webMessage.key.remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    if (!participant?.admin) {
      return;
    }

    const targetJid = contextInfo.participant;
    const remoteJid = webMessage.key.remoteJid;
    const targetNumber = onlyNumbers(targetJid);

    if (!checkIfMemberIsMuted(remoteJid, targetJid)) {
      await socket.sendMessage(remoteJid, {
        text: `⚠️ @${targetNumber} não está mutado!`,
        mentions: [targetJid]
      });
      return;
    }

    unmuteMember(remoteJid, targetJid);

    await socket.sendMessage(remoteJid, {
      text: `🔊 @${targetNumber} foi desmutado com sucesso!\n\n_Agora pode enviar mensagens normalmente._`,
      mentions: [targetJid]
    });

  } catch (error) {
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

    if (checkIfMemberIsMuted(remoteJid, userJid)) {
      await socket.sendMessage(remoteJid, {
        delete: {
          remoteJid,
          fromMe: false,
          id: messageId,
          participant: userJid,
        },
      });
      return;
    }

    await handleStickerTrigger(socket, webMessage);
    await handleStickerDelete(socket, webMessage);
    await handleStickerWarn(socket, webMessage);
    await handleStickerMute(socket, webMessage);
    await handleStickerUnmute(socket, webMessage);

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

    const antiGroups = readGroupRestrictions();
    const messageType = Object.keys(readRestrictedMessageTypes()).find(type =>
      getContent(webMessage, type)
    );
    
    if (!messageType) return;

    if (textMessage.startsWith("#")) {
      return;
    }

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