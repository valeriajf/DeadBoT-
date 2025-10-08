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
  "55,34,160,197,224,119,254,146,74,95,29,248,50,94,78,234,249,52,170,236,55,18,121,162,186,179,73,247,175,4,43,65",
];

// Lista de figurinhas que dão advertência (use o get-sticker)
const STICKER_WARN_IDS = [
  "125,25,26,73,157,3,235,215,28,175,13,142,244,107,111,94,249,240,238,129,75,130,118,211,148,89,193,124,220,63,216,64",
  "40,174,232,220,174,0,221,145,132,95,162,92,246,204,159,169,92,59,229,105,200,128,255,50,147,11,235,208,223,225,210,61",
  "109,147,125,95,170,62,65,69,31,59,163,20,124,180,102,110,129,112,149,168,159,134,178,1,105,108,11,108,61,101,237,55",
];

// Lista de figurinhas que mutam usuários (use o get-sticker)
const STICKER_MUTE_IDS = [
  "22,222,12,197,90,49,113,84,147,37,44,94,233,54,187,39,104,97,187,179,66,113,198,213,80,172,160,197,152,178,113,78",
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

// Função auxiliar para extrair número do JID
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

// Função para lidar com figurinhas de mute
async function handleStickerMute(socket, webMessage) {
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

    // Verifica se esta figurinha está na lista de mute
    if (!STICKER_MUTE_IDS.includes(numericId)) {
      return; // Figurinha não está registrada como de mute
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
    const targetNumber = onlyNumbers(targetJid);

    // Verifica se é o dono do bot
    if ([OWNER_NUMBER, OWNER_LID.replace("@lid", "")].includes(targetNumber)) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode mutar o dono do bot!',
      });
      return;
    }

    // Verifica se é o próprio bot
    if (targetJid === `${BOT_NUMBER}@s.whatsapp.net`) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode mutar o bot.',
      });
      return;
    }

    // Verifica se o alvo é admin
    const isTargetAdmin = metadata.participants.some(
      p => p.id === targetJid && p.admin
    );

    if (isTargetAdmin) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode mutar um administrador.',
      });
      return;
    }

    // Verifica se já está mutado
    if (checkIfMemberIsMuted(remoteJid, targetJid)) {
      await socket.sendMessage(remoteJid, {
        text: `⚠️ @${targetNumber} já está mutado neste grupo.`,
        mentions: [targetJid]
      });
      return;
    }

    // Muta o usuário
    muteMember(remoteJid, targetJid);

    await socket.sendMessage(remoteJid, {
      text: `🔇 @${targetNumber} foi mutado com sucesso!\n\n_Suas mensagens serão deletadas automaticamente._`,
      mentions: [targetJid]
    });

  } catch (error) {
    console.error("Erro no handleStickerMute:", error);
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

    // === VERIFICA SE O USUÁRIO ESTÁ MUTADO (deve vir ANTES de processar figurinhas) ===
    if (checkIfMemberIsMuted(remoteJid, userJid)) {
      // Deleta QUALQUER mensagem de usuário mutado
      await socket.sendMessage(remoteJid, {
        delete: {
          remoteJid,
          fromMe: false,
          id: messageId,
          participant: userJid,
        },
      });
      return; // Importante: retorna aqui para não processar nada mais
    }

    // Checa se a figurinha é o gatilho do tagall (somente ADM)
    await handleStickerTrigger(socket, webMessage);

    // Checa se a figurinha é deletora (somente ADM)
    await handleStickerDelete(socket, webMessage);

    // Checa se a figurinha é de advertência (somente ADM)
    await handleStickerWarn(socket, webMessage);

    // Checa se a figurinha é de mute (somente ADM)
    await handleStickerMute(socket, webMessage);

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