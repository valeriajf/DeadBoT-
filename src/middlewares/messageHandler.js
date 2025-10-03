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
const fs = require('fs');
const path = require('path');

// Importa comandos AFK
const afk = require("../commands/member/afk");
const voltei = require("../commands/member/voltei");

// Lista de figurinhas que disparam o tagall (use o get-sticker)
const STICKER_TRIGGER_IDS = [
  "53,225,101,3,79,205,223,221,176,177,67,47,163,77,29,64,212,190,224,11,239,178,132,118,32,88,30,252,116,153,193,63",
  "112,155,6,81,56,38,147,157,4,47,104,132,235,159,179,53,184,58,195,241,79,85,141,227,125,170,193,105,223,65,36,225",
  "243,137,34,251,196,254,76,37,73,207,68,60,171,180,206,32,120,151,54,187,109,98,36,21,209,199,173,33,156,133,153,24",
  "112,83,51,205,130,71,36,153,232,175,254,126,111,186,151,208,127,160,63,153,188,2,111,179,239,231,97,97,62,66,195,98",
];

// Lista de figurinhas que deletam mensagens (use o get-sticker) - GLOBAL para todos os grupos
const STICKER_DELETE_IDS = [
  "87,176,148,227,183,43,241,92,249,146,251,65,207,248,108,199,221,42,234,236,86,44,195,22,72,100,248,80,4,73,11,94",
];

// Lista de figurinhas que dão advertência (use o get-sticker)
const STICKER_WARN_IDS = [
  "110,150,177,252,161,121,234,162,171,175,60,83,50,17,168,241,100,242,92,12,105,135,176,169,30,64,223,96,131,176,56,168",
];

const warnsFile = path.join(__dirname, '../warns.json');

// Função auxiliar para ler warns
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

// Função auxiliar para salvar warns
function saveWarns(warns) {
  try {
    fs.writeFileSync(warnsFile, JSON.stringify(warns, null, 2));
  } catch (error) {
    console.error('Erro ao salvar warns:', error);
  }
}

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

// Função para lidar com figurinhas deletoras
async function handleStickerDelete(socket, webMessage) {
  try {
    // Verifica se a mensagem atual é uma figurinha
    if (!webMessage.message?.stickerMessage) return;

    // Verifica se é uma resposta a outra mensagem
    const contextInfo = webMessage.message.stickerMessage.contextInfo;
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      return; // Não é uma resposta, ignora
    }

    // Pega o ID da figurinha atual
    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    // Converte para ID numérico (mesmo formato usado no tagall)
    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    // Verifica se esta figurinha está na lista de deletoras
    if (!STICKER_DELETE_IDS.includes(numericId)) {
      return; // Figurinha não está registrada como deletora
    }

    // Verificação de ADM (igual ao handleStickerTrigger)
    const metadata = await socket.groupMetadata(webMessage.key.remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    // Verifica se quem enviou é ADM ou SUPERADM
    if (!participant?.admin) {
      return;
    }

    // Deleta a mensagem respondida
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
    // Log de erro silencioso - apenas para debug se necessário
  }
}

// Função para lidar com figurinhas de advertência
async function handleStickerWarn(socket, webMessage) {
  try {
    // Verifica se a mensagem atual é uma figurinha
    if (!webMessage.message?.stickerMessage) return;

    // Verifica se é uma resposta a outra mensagem
    const contextInfo = webMessage.message.stickerMessage.contextInfo;
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      return; // Não é uma resposta, ignora
    }

    // Pega o ID da figurinha atual
    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    // Converte para ID numérico
    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    // Verifica se esta figurinha está na lista de advertência
    if (!STICKER_WARN_IDS.includes(numericId)) {
      return; // Figurinha não está registrada como de advertência
    }

    // Verificação de ADM
    const metadata = await socket.groupMetadata(webMessage.key.remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    // Verifica se quem enviou é ADM ou SUPERADM
    if (!participant?.admin) {
      return;
    }

    // Pega o alvo (quem recebeu reply)
    const targetJid = contextInfo.participant;
    const remoteJid = webMessage.key.remoteJid;

    // Lê warns do arquivo
    let warns = readWarns();
    
    // Adiciona advertência
    warns[targetJid] = (warns[targetJid] || 0) + 1;
    const count = warns[targetJid];

    // Salva warns
    saveWarns(warns);

    if (count >= 3) {
      // Usuário atingiu 3 advertências
      await socket.sendMessage(remoteJid, {
        text: `🚫 @${targetJid.split('@')[0]} atingiu 3 advertências e será removido.`,
        mentions: [targetJid]
      });

      try {
        // Remove o usuário
        await socket.groupParticipantsUpdate(remoteJid, [targetJid], 'remove');
        
        // Reseta advertências
        warns[targetJid] = 0;
        saveWarns(warns);
      } catch (error) {
        await socket.sendMessage(remoteJid, { 
          text: '❌ Erro ao remover o usuário. O bot é administrador?' 
        });
      }
    } else {
      // Ainda não atingiu 3 advertências
      await socket.sendMessage(remoteJid, {
        text: `⚠️ @${targetJid.split('@')[0]} recebeu uma advertência.\n🔢 Total: ${count}/3`,
        mentions: [targetJid]
      });
    }

  } catch (error) {
    console.error("Erro no handleStickerWarn:", error);
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

    // Checa se a figurinha é o gatilho do tagall (somente ADM)
    await handleStickerTrigger(socket, webMessage);

    // Checa se a figurinha é deletora (somente ADM)
    await handleStickerDelete(socket, webMessage);

    // Checa se a figurinha é de advertência (somente ADM)
    await handleStickerWarn(socket, webMessage);

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
    
    // Se não encontrou tipo de mensagem, retorna (não há nada para restringir)
    if (!messageType) return;

    // CORREÇÃO: Não aplica anti-grupo para comandos
    if (textMessage.startsWith("#")) {
      return; // Se for comando, não aplica restrições do anti-grupo
    }

    const isAntiActive = !!antiGroups[remoteJid]?.[`anti-${messageType}`];
    if (!isAntiActive) return;

    // Deleta a mensagem se a restrição estiver ativa
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