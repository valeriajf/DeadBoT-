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
  "166,237,218,54,12,17,140,90,120,33,221,12,75,117,206,201,204,77,149,195,174,123,245,105,195,79,101,29,246,176,64,129",
  
  "118,241,161,38,38,225,155,187,29,20,224,18,55,113,180,249,156,233,179,230,147,11,138,15,240,185,155,210,78,119,135,131",
  
  "98,115,167,75,247,222,105,216,167,92,23,7,198,73,174,142,132,83,157,62,170,205,72,116,81,3,117,237,195,170,60,244",
  
  "131,69,66,9,241,7,121,234,26,18,185,11,110,193,28,217,129,66,124,123,39,215,105,255,227,152,186,187,136,15,96,98",
  
  "240,7,254,6,166,110,84,223,76,32,15,221,168,114,150,95,139,45,181,61,34,25,161,226,110,161,127,142,44,52,239,28",
  
  "96,177,22,38,132,33,63,179,190,73,233,203,70,200,117,6,133,186,41,152,4,169,149,227,247,167,32,181,92,209,119,234",
  
  "73,191,153,186,15,234,55,157,234,15,201,135,93,112,124,57,188,52,227,58,238,166,237,148,127,249,214,238,46,216,111,41",
  
  "72,88,194,237,71,172,208,226,255,242,155,50,202,122,95,255,194,156,250,147,209,12,206,98,178,34,132,175,136,58,76,18",
  
  "23,6,179,225,174,176,194,97,10,81,151,5,132,230,47,211,223,187,106,229,237,16,140,241,32,150,190,188,131,209,88,161",
  
  "145,145,59,139,227,73,133,116,249,123,115,242,150,142,29,146,70,88,177,172,9,47,210,106,192,111,64,142,101,45,55,173",
  
  "15,2,50,40,111,20,148,23,209,215,11,111,196,148,1,17,223,231,214,157,36,246,232,3,170,77,229,190,250,197,136,72",
  
  "218,254,52,24,134,17,4,2,52,124,134,78,162,197,228,27,113,53,146,18,224,208,55,163,247,170,28,114,200,122,98,190",
  
  "30,52,98,246,168,2,112,22,15,156,170,90,207,24,100,35,102,218,24,228,147,102,195,53,53,141,199,61,88,117,209,87",
];

// Lista de figurinhas que mutam usuários (use o get-sticker)
const STICKER_MUTE_IDS = [
  "69,148,108,127,91,47,253,91,121,79,9,189,37,245,99,205,48,29,211,47,183,162,88,235,110,27,255,205,29,100,43,92",
];

// Lista de figurinhas que desmutam usuários (use o get-sticker)
const STICKER_UNMUTE_IDS = [
  "144,135,209,13,225,158,253,24,180,169,221,127,22,140,83,132,14,235,191,220,10,19,185,244,24,77,65,134,226,187,228,195",
];

// Lista de figurinhas que adicionam à lista negra (use o get-sticker)
const STICKER_BLACKLIST_IDS = [
  "40,129,6,142,36,237,210,120,194,13,199,18,62,145,244,172,15,224,156,124,248,98,41,46,204,225,172,202,226,75,188,84",
];

// Lista de figurinhas que promovem usuários a ADM (use o get-sticker)
const STICKER_PROMOTE_IDS = [
  "150,36,21,208,34,172,94,51,170,226,158,254,16,137,198,12,5,246,158,145,67,232,64,203,140,113,110,119,133,75,202,242",
  
  "169,58,5,90,95,197,184,23,216,212,217,121,169,127,150,148,43,18,14,128,244,22,114,119,196,245,119,61,15,67,227,2",
];

// Lista de figurinhas que rebaixam administradores (use o get-sticker)
const STICKER_DEMOTE_IDS = [
  "135,117,179,112,82,88,39,145,177,26,22,52,126,40,71,218,124,6,143,177,166,235,216,218,114,3,32,124,100,42,22,162",
  
  "185,174,244,99,214,95,235,68,14,202,46,89,85,211,82,240,96,111,107,4,131,184,7,32,251,190,121,196,243,251,86,63",
];

// Lista de figurinhas que ativam/desativam modo admin-only
const STICKER_ADMIN_ONLY_IDS = [
  "95,181,130,218,104,202,71,146,141,123,129,217,95,220,246,195,245,138,251,65,211,71,117,249,78,74,104,34,31,253,208,144",
  
  "183,65,157,176,79,95,189,24,144,76,196,163,144,110,230,121,235,98,114,109,31,65,186,161,37,119,233,146,110,77,117,32",
  
];

// Lista de figurinhas que marcam todos os administradores
const STICKER_TAG_ADM_IDS = [
  "160,61,15,230,141,158,84,106,199,104,39,177,1,18,176,243,24,145,246,125,61,215,154,2,189,165,162,16,25,70,142,110",
  
  "113,67,140,225,164,115,62,90,101,153,208,74,161,143,161,235,216,27,131,144,127,208,68,41,202,41,41,7,118,237,46,111",
  
  "207,119,53,31,199,0,160,171,253,225,50,129,91,42,143,108,222,113,109,161,191,46,71,26,61,2,52,238,88,18,200,204",
  
  "118,253,6,203,50,179,40,197,198,10,153,52,219,201,94,252,163,131,140,118,175,207,144,106,77,248,107,31,232,110,178,180",
  
  "7,26,234,62,39,179,181,143,132,105,31,62,3,66,35,117,123,161,49,139,137,188,81,249,184,78,133,60,197,226,245,102",
  
  "138,225,237,194,60,231,106,197,191,255,99,166,144,71,138,223,81,29,10,121,32,173,62,153,83,129,130,254,103,217,94,167",
  
  "175,32,132,251,252,64,142,106,3,248,49,199,250,199,10,238,162,197,226,90,35,47,101,147,218,75,90,186,254,167,5,119",
];

// CORRIGIDO: Sobe duas pastas para chegar à raiz do projeto
const warnsFile = path.join(__dirname, '../../warns.json');
const blacklistFile = path.join(__dirname, '../../blacklist.json');

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

function readBlacklist() {
  if (!fs.existsSync(blacklistFile)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(blacklistFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveBlacklist(blacklist) {
  try {
    fs.writeFileSync(blacklistFile, JSON.stringify(blacklist, null, 2));
    console.log('✅ Blacklist salva com sucesso em:', blacklistFile);
  } catch (error) {
    console.error('❌ Erro ao salvar blacklist:', error);
  }
}

/**
 * Busca o número de telefone real de um usuário através de múltiplas fontes
 */
async function findRealPhoneNumber(socket, remoteJid, userJid, webMessage) {
  try {
    // 1. Se já é um JID normal (@s.whatsapp.net), retorna direto
    if (userJid.includes('@s.whatsapp.net')) {
      return userJid.split('@')[0];
    }
    
    // 2. Busca nos metadados do grupo
    try {
      const metadata = await socket.groupMetadata(remoteJid);
      
      // Procura nos participantes
      for (const p of metadata.participants) {
        // Compara com id, lid ou jid
        if (p.id === userJid || p.lid === userJid || p.jid === userJid) {
          // PRIORIDADE 1: Campo JID (contém o número real!)
          if (p.jid && p.jid.includes('@s.whatsapp.net')) {
            return p.jid.split('@')[0];
          }
          
          // PRIORIDADE 2: Campo ID (fallback)
          if (p.id && p.id.includes('@s.whatsapp.net')) {
            return p.id.split('@')[0];
          }
        }
      }
    } catch (e) {
      console.error('Erro ao buscar metadados do grupo:', e.message);
    }
    
    // 3. Tenta via store do socket
    if (socket.store && socket.store.contacts) {
      const contact = socket.store.contacts[userJid];
      if (contact && contact.id && contact.id.includes('@s.whatsapp.net')) {
        return contact.id.split('@')[0];
      }
    }
    
    // 4. Último recurso: retorna o LID (não conseguiu converter)
    return userJid.split('@')[0];
    
  } catch (error) {
    console.error('Erro ao buscar número real:', error);
    return userJid.split('@')[0];
  }
}

async function addToBlacklist(socket, remoteJid, userJid, webMessage) {
  const blacklist = readBlacklist();
  
  // Busca o número de telefone real
  const phoneNumber = await findRealPhoneNumber(socket, remoteJid, userJid, webMessage);
  const isLidOnly = phoneNumber.length > 15;
  
  // Dados a serem salvos
  const userData = {
    addedAt: new Date().toISOString(),
    number: phoneNumber,
    originalJid: userJid,
    isLidOnly: isLidOnly
  };
  
  // Sempre salva com o JID original
  blacklist[userJid] = userData;
  
  // Se conseguiu um número de telefone válido (não é LID puro)
  if (!isLidOnly && phoneNumber.length >= 10) {
    const standardJid = `${phoneNumber}@s.whatsapp.net`;
    blacklist[standardJid] = userData;
    console.log(`🚫 Usuário ${phoneNumber} adicionado à blacklist`);
  } else {
    console.log(`⚠️ Usuário ${userJid} adicionado à blacklist (número não disponível)`);
  }
  
  saveBlacklist(blacklist);
}

function isBlacklisted(userJid) {
  const blacklist = readBlacklist();
  
  // Verifica diretamente pelo JID recebido
  if (blacklist[userJid]) {
    return true;
  }
  
  // Verifica pelo número (converte para JID padrão)
  const number = onlyNumbers(userJid);
  const standardJid = `${number}@s.whatsapp.net`;
  
  if (blacklist[standardJid]) {
    return true;
  }
  
  // Verifica se alguma entrada tem o mesmo número
  for (const [jid, data] of Object.entries(blacklist)) {
    if (data.number === number) {
      return true;
    }
  }
  
  return false;
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

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    // 1. Verifica se é a figurinha de deletar
    if (!STICKER_DELETE_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    // 2. Verifica se existe contextInfo (mensagem respondida)
    // Se NÃO houver, envia instrução IMEDIATAMENTE
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do usuário para apagar*'
      });
      return;
    }

    // 3. A partir daqui, já sabemos que tem uma mensagem respondida
    const metadata = await socket.groupMetadata(remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    if (!participant?.admin) {
      return;
    }

    const { stanzaId, participant: targetParticipant } = contextInfo;
    
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

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    // 1. Verifica se é a figurinha de advertência
    if (!STICKER_WARN_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    // 2. Verifica se existe contextInfo (mensagem respondida)
    // Se NÃO houver, envia instrução IMEDIATAMENTE
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do usuário para advertir*'
      });
      return;
    }

    // 3. A partir daqui, já sabemos que tem uma mensagem respondida
    const metadata = await socket.groupMetadata(remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    if (!participant?.admin) {
      return;
    }

    const targetJid = contextInfo.participant;

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

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    // 1. Verifica se é a figurinha de mutar
    if (!STICKER_MUTE_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    // 2. Verifica se existe contextInfo (mensagem respondida)
    // Se NÃO houver, envia instrução IMEDIATAMENTE
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do usuário para mutar*'
      });
      return;
    }

    // 3. A partir daqui, já sabemos que tem uma mensagem respondida
    const metadata = await socket.groupMetadata(remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    if (!participant?.admin) {
      return;
    }

    const targetJid = contextInfo.participant;
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

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    // 1. Verifica se é a figurinha de desmutar
    if (!STICKER_UNMUTE_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    // 2. Verifica se existe contextInfo (mensagem respondida)
    // Se NÃO houver, envia instrução IMEDIATAMENTE
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do usuário para desmutar*'
      });
      return;
    }

    // 3. A partir daqui, já sabemos que tem uma mensagem respondida
    const metadata = await socket.groupMetadata(remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    if (!participant?.admin) {
      return;
    }

    const targetJid = contextInfo.participant;
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

async function handleStickerBlacklist(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    // 1. Verifica se é a figurinha de blacklist
    if (!STICKER_BLACKLIST_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    // 2. Verifica se existe contextInfo (mensagem respondida)
    // Se NÃO houver, envia instrução IMEDIATAMENTE
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque o alvo para enviar à lista negra*'
      });
      return;
    }

    // 3. A partir daqui, já sabemos que tem uma mensagem respondida
    // Agora sim fazemos as validações de admin, proteções, etc.

    const metadata = await socket.groupMetadata(remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    // Verifica se quem está usando é admin
    if (!participant?.admin) {
      return;
    }

    const targetJid = contextInfo.participant;
    const targetNumber = onlyNumbers(targetJid);

    // Proteção: não pode blacklistar o dono
    if ([OWNER_NUMBER, OWNER_LID.replace("@lid", "")].includes(targetNumber)) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode adicionar o dono do bot à lista negra!',
      });
      return;
    }

    // Proteção: não pode blacklistar o próprio bot
    if (targetJid === `${BOT_NUMBER}@s.whatsapp.net`) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode adicionar o bot à lista negra.',
      });
      return;
    }

    // Proteção: não pode blacklistar outros admins
    const isTargetAdmin = metadata.participants.some(
      p => p.id === targetJid && p.admin
    );

    if (isTargetAdmin) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode adicionar um administrador à lista negra.',
      });
      return;
    }

    // Verifica se já está na blacklist
    if (isBlacklisted(targetJid)) {
      await socket.sendMessage(remoteJid, {
        text: `⚠️ @${targetNumber} já está na lista negra!`,
        mentions: [targetJid]
      });
      return;
    }

    // Adiciona à lista negra (passa webMessage completo para análise)
    await addToBlacklist(socket, remoteJid, targetJid, webMessage);

    // Envia mensagem de aviso
    await socket.sendMessage(remoteJid, {
      text: `🚫 @${targetNumber} foi adicionado à lista negra e será removido!\n\n_Este usuário não poderá mais participar de grupos onde o bot está presente._`,
      mentions: [targetJid]
    });

    // Remove o usuário do grupo
    try {
      await socket.groupParticipantsUpdate(remoteJid, [targetJid], 'remove');
    } catch (error) {
      await socket.sendMessage(remoteJid, { 
        text: '❌ Erro ao remover o usuário. O bot é administrador?' 
      });
    }

  } catch (error) {
    console.error('Erro ao processar blacklist por sticker:', error);
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

    // Verifica se o usuário está na blacklist
    if (isBlacklisted(userJid)) {
      await socket.sendMessage(remoteJid, {
        text: `🚫 @${onlyNumbers(userJid)} está na lista negra e será removido.`,
        mentions: [userJid]
      });
      
      try {
        await socket.groupParticipantsUpdate(remoteJid, [userJid], 'remove');
      } catch (error) {
        console.error('Erro ao remover usuário da blacklist:', error);
      }
      return;
    }

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
    
async function handleStickerPromote(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    // 1. Verifica se é a figurinha de promover
    if (!STICKER_PROMOTE_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    // 2. Se não marcou a mensagem do alvo
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do usuário que deseja promover*'
      });
      return;
    }

    // 3. Verifica se quem usou é admin
    const metadata = await socket.groupMetadata(remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    if (!participant?.admin) {
      return;
    }

    const targetJid = contextInfo.participant;
    const targetNumber = onlyNumbers(targetJid);

    // 4. Proteções
    if (targetJid === `${BOT_NUMBER}@s.whatsapp.net`) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Não faz sentido me promover, eu já mando aqui 😎'
      });
      return;
    }

    const isTargetAdmin = metadata.participants.some(
      p => p.id === targetJid && p.admin
    );

    if (isTargetAdmin) {
      await socket.sendMessage(remoteJid, {
        text: `⚠️ @${targetNumber} já é administrador.`,
        mentions: [targetJid]
      });
      return;
    }

    // 5. Promove
    try {
      await socket.groupParticipantsUpdate(remoteJid, [targetJid], 'promote');

      await socket.sendMessage(remoteJid, {
        text: `👑 @${targetNumber} agora é administrador!`,
        mentions: [targetJid]
      });
    } catch (error) {
      await socket.sendMessage(remoteJid, { 
        text: '❌ Não consegui promover. O bot precisa ser administrador.' 
      });
    }

  } catch (error) {
    console.error('Erro ao promover por figurinha:', error);
  }
}

async function handleStickerDemote(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    // 1. Verifica se é a figurinha de demote
    if (!STICKER_DEMOTE_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    // 2. Se não marcou a mensagem do alvo
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do administrador que deseja rebaixar*'
      });
      return;
    }

    // 3. Verifica se quem usou é admin
    const metadata = await socket.groupMetadata(remoteJid);
    const participant = metadata.participants.find(p => p.id === webMessage.key.participant);

    if (!participant?.admin) {
      return;
    }

    const targetJid = contextInfo.participant;
    const targetNumber = onlyNumbers(targetJid);

    // 4. Proteções importantes

    // Não pode rebaixar o dono
    if ([OWNER_NUMBER, OWNER_LID.replace("@lid", "")].includes(targetNumber)) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode rebaixar o dono do bot!'
      });
      return;
    }

    // Não pode rebaixar o bot
    if (targetJid === `${BOT_NUMBER}@s.whatsapp.net`) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Não posso me auto rebaixar 😎'
      });
      return;
    }

    const isTargetAdmin = metadata.participants.some(
      p => p.id === targetJid && p.admin
    );

    if (!isTargetAdmin) {
      await socket.sendMessage(remoteJid, {
        text: `⚠️ @${targetNumber} não é administrador.`,
        mentions: [targetJid]
      });
      return;
    }

    // 5. Rebaixar
    try {
      await socket.groupParticipantsUpdate(remoteJid, [targetJid], 'demote');

      await socket.sendMessage(remoteJid, {
        text: `📉 @${targetNumber} deixou de ser administrador.`,
        mentions: [targetJid]
      });
    } catch (error) {
      await socket.sendMessage(remoteJid, { 
        text: '❌ Não consegui rebaixar. O bot precisa ser administrador.' 
      });
    }

  } catch (error) {
    console.error('Erro ao rebaixar por figurinha:', error);
  }
}

async function handleStickerAdminOnly(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    // 1. Verifica se é a figurinha admin-only
    if (!STICKER_ADMIN_ONLY_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;

    // 2. Verifica se quem usou é admin
    const metadata = await socket.groupMetadata(remoteJid);
    const participant = metadata.participants.find(
      p => p.id === webMessage.key.participant
    );

    if (!participant?.admin) {
      return;
    }

    // 3. Verifica estado atual do grupo
    const isAdminOnly = metadata.announce === true;

    try {
      if (isAdminOnly) {
        // Abrir grupo
        await socket.groupSettingUpdate(remoteJid, "not_announcement");

        await socket.sendMessage(remoteJid, {
          text: "🔓 Grupo aberto! Todos podem enviar mensagens."
        });
      } else {
        // Fechar grupo
        await socket.groupSettingUpdate(remoteJid, "announcement");

        await socket.sendMessage(remoteJid, {
          text: "🔒 Modo admin ativado! Apenas administradores podem falar."
        });
      }
    } catch (error) {
      await socket.sendMessage(remoteJid, {
        text: "❌ Não consegui alterar o modo do grupo. O bot precisa ser administrador."
      });
    }

  } catch (error) {
    console.error("Erro no admin-only por figurinha:", error);
  }
}

async function handleStickerTagAdmins(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const buf = webMessage.message.stickerMessage.fileSha256;
    if (!buf || buf.length === 0) return;

    const stickerIdNumeric = Array.from(buf).join(",");

    // Verifica se é a figurinha correta
    if (!STICKER_TAG_ADM_IDS.includes(stickerIdNumeric)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;

    // Só funciona em grupo
    if (!remoteJid.endsWith("@g.us")) {
      return;
    }

    // Metadados do grupo
    const metadata = await socket.groupMetadata(remoteJid);
    const groupName = metadata.subject || "este grupo";

    // ❗ REMOVIDO: bloqueio que exigia ser admin
    // Agora qualquer membro pode chamar os ADMs

    // Lista de admins
    const admins = metadata.participants
      .filter(p => p.admin)
      .map(p => p.id);

    if (!admins.length) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Não encontrei administradores neste grupo.'
      });
      return;
    }

    // Monta menções
    const mentionsText = admins
      .map(admin => `@${admin.split("@")[0]}`)
      .join(" ");

    // Layout padrão DeadBoT
    const finalMessage =
`👮 *Chamando os ADMs*
🪀 Grupo: *${groupName}*

${mentionsText}`;

    // Envia mensagem
    await socket.sendMessage(remoteJid, {
      text: finalMessage,
      mentions: admins
    }, { quoted: webMessage });

  } catch (error) {
    console.error('Erro ao marcar admins por figurinha:', error);
  }
}

    await handleStickerTrigger(socket, webMessage);
    await handleStickerDelete(socket, webMessage);
    await handleStickerWarn(socket, webMessage);
    await handleStickerMute(socket, webMessage);
    await handleStickerUnmute(socket, webMessage);
    await handleStickerBlacklist(socket, webMessage);
    await handleStickerPromote(socket, webMessage);
    await handleStickerDemote(socket, webMessage);
    await handleStickerAdminOnly(socket, webMessage);
    await handleStickerTagAdmins(socket, webMessage);

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