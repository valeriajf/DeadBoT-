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

// =============================
// HELPER: verifica se o remetente é o dono do bot
// =============================
function isOwner(jid) {
  if (!jid) return false;
  const number = jid.replace(/\D/g, "");
  const ownerLidClean = OWNER_LID ? OWNER_LID.replace("@lid", "").replace(/\D/g, "") : "";
  return number === String(OWNER_NUMBER) || (ownerLidClean && number === ownerLidClean);
}

//Figurinha que envia o link do grupo
const STICKER_GROUP_LINK_IDS = [
  "237,248,218,53,65,128,225,154,69,102,183,55,154,85,52,106,10,190,31,139,94,100,66,210,227,187,13,255,146,223,77,115"
];

// Lista de figurinhas que puxam a descrição do grupo
const STICKER_GROUP_DESCRIPTION_IDS = [
  "16,9,222,60,131,251,241,100,163,197,50,157,76,226,38,0,127,55,158,204,217,97,19,25,38,121,166,235,196,185,254,29",
  
];

// =============================
// SISTEMA DE FIGURINHAS INTELIGENTES
// =============================

// cache rotativo por grupo + figurinha
const stickerMessageCache = new Map();

// IDs das figurinhas (SHA256)
const STICKER_SMART_MESSAGES = {

  // 🌅 MANHÃ (10 mensagens)
  "217,190,46,102,162,40,142,237,156,160,17,3,230,226,153,185,123,165,14,73,138,20,103,32,35,90,101,49,111,145,62,10": [
    "🌅 Bom dia, pessoal! Que o dia comece leve e abençoado 🙏",
    "☀️ Bom dia! Bora vencer mais um dia 💪",
    "🌄 Acorda grupo! O dia já começou cheio de oportunidades ✨",
    "🌻 Bom dia! Que hoje seja incrível pra todos nós 😄",
    "🙏 Um ótimo dia pra todos! Energia positiva sempre!",
    "🌞 Bom dia! Que nada te impeça de sorrir hoje.",
    "✨ Hoje é um novo começo. Bom dia, grupo!",
    "☕ Café tomado? Então bora viver esse dia!",
    "🚀 Bom dia! Foque no que te faz crescer.",
    "💛 Que seu dia seja leve, produtivo e feliz!"
  ],

  // ☀️ TARDE (10 mensagens)
  "220,122,101,4,180,109,40,30,122,54,227,150,46,180,180,68,142,75,125,121,132,172,203,242,81,172,140,201,247,230,146,169": [
    "☀️ Boa tarde, pessoal! Como está o dia de vocês?",
    "🌞 Passando pra desejar uma ótima tarde pra todos 🙌",
    "💛 Que sua tarde seja produtiva e tranquila!",
    "☕ Bora continuar firme que o dia ainda rende!",
    "🔥 Boa tarde! Não desanima, ainda dá tempo de fazer acontecer.",
    "✨ Que sua tarde seja cheia de coisas boas.",
    "🚀 Continue! Você está indo bem.",
    "🌻 Uma tarde leve e positiva pra todo mundo!",
    "📈 Foco e constância! Boa tarde, grupo.",
    "😊 Respira, se organiza e segue. Boa tarde!"
  ],

  // 🌙 NOITE (10 mensagens)
  "100,102,229,217,44,250,249,166,143,74,160,213,200,135,55,23,90,168,224,77,164,76,222,163,66,121,250,215,87,117,206,122": [
    "🌙 Boa noite, grupo! Descansem bem 😴",
    "✨ Que a noite traga paz e tranquilidade pra todos 🙏",
    "🌌 Boa noite! Hora de desacelerar e relaxar",
    "🛌 Que amanhã seja ainda melhor. Boa noite!",
    "💫 Gratidão pelo dia de hoje. Boa noite, pessoal!",
    "😌 Hora de descansar a mente e o corpo.",
    "🌠 Boa noite! Recarregue as energias.",
    "🙏 Deus abençoe a noite de cada um.",
    "💤 Durmam bem e até amanhã!",
    "🌜 Finalizando mais um dia. Boa noite!"
  ],

  // 💪 MOTIVACIONAL (10 mensagens)
  "239,55,96,251,174,164,222,72,23,117,110,18,142,89,61,82,146,101,89,165,10,241,240,174,56,69,5,86,175,228,235,3": [
    "💪 Nunca desista. Grandes coisas levam tempo!",
    "🔥 Você é mais forte do que imagina.",
    "🚀 Continue! Cada passo te aproxima da vitória.",
    "✨ Acredite no seu potencial.",
    "🏆 Disciplina vence motivação.",
    "📈 Pequenos progressos ainda são progressos.",
    "🌟 O esforço de hoje é o sucesso de amanhã.",
    "💭 Pensamento positivo gera resultado positivo.",
    "⚡ Levanta e faz acontecer!",
    "🙌 Você consegue. Só não pode parar."
  ],

  // 📢 PROPAGANDA
  "136,212,244,236,205,204,77,201,25,71,237,246,168,220,37,103,10,31,98,202,241,222,119,1,194,10,191,8,121,178,154,1": [
    "📢 *Gostou do DeadBoT? Entre em contato para alugar e transformar seu grupo*"
  ]
};

// Lista de figurinhas que disparam o tagall
const STICKER_TRIGGER_IDS = [
  "227,46,215,121,98,204,115,82,87,139,171,69,176,148,56,239,239,142,185,103,50,47,56,106,211,1,128,222,71,218,157,226",
  
];

// Lista de figurinhas que deletam mensagens
const STICKER_DELETE_IDS = [
  "16,115,187,157,108,244,163,167,150,93,60,215,218,51,92,149,43,107,120,57,5,117,129,120,128,170,228,32,1,70,59,61",
];

// Lista de figurinhas que mutam usuários
const STICKER_MUTE_IDS = [
  "69,148,108,127,91,47,253,91,121,79,9,189,37,245,99,205,48,29,211,47,183,162,88,235,110,27,255,205,29,100,43,92",
];

// Lista de figurinhas que desmutam usuários
const STICKER_UNMUTE_IDS = [
  "144,135,209,13,225,158,253,24,180,169,221,127,22,140,83,132,14,235,191,220,10,19,185,244,24,77,65,134,226,187,228,195",
];

// Lista de figurinhas que adicionam à lista negra
const STICKER_BLACKLIST_IDS = [
  "40,129,6,142,36,237,210,120,194,13,199,18,62,145,244,172,15,224,156,124,248,98,41,46,204,225,172,202,226,75,188,84",
];

// Lista de figurinhas que promovem usuários a ADM
const STICKER_PROMOTE_IDS = [
  "150,36,21,208,34,172,94,51,170,226,158,254,16,137,198,12,5,246,158,145,67,232,64,203,140,113,110,119,133,75,202,242",
  
];

// Lista de figurinhas que rebaixam administradores
const STICKER_DEMOTE_IDS = [
  "135,117,179,112,82,88,39,145,177,26,22,52,126,40,71,218,124,6,143,177,166,235,216,218,114,3,32,124,100,42,22,162",
  
];

// Lista de figurinhas que ativam/desativam modo admin-only
const STICKER_ADMIN_ONLY_IDS = [
  "95,181,130,218,104,202,71,146,141,123,129,217,95,220,246,195,245,138,251,65,211,71,117,249,78,74,104,34,31,253,208,144",
  
];

// Lista de figurinhas que marcam todos os administradores
const STICKER_TAG_ADM_IDS = [
  "160,61,15,230,141,158,84,106,199,104,39,177,1,18,176,243,24,145,246,125,61,215,154,2,189,165,162,16,25,70,142,110",
  
];

// =============================
// PATHS DOS ARQUIVOS DE DADOS
// =============================
const warnsFile = path.join(__dirname, '../../warns.json');
const blacklistFile = path.join(__dirname, '../../blacklist.json');

// =============================
// SISTEMA fig-adv — leitura dinâmica do banco de advertências
// =============================

const advDbPath = path.join(__dirname, '../database/fig-adv.json');

function readAdvStickers() {
  if (!fs.existsSync(advDbPath)) return [];
  try {
    const db = JSON.parse(fs.readFileSync(advDbPath, 'utf8'));
    return Array.isArray(db.stickers) ? db.stickers : [];
  } catch {
    return [];
  }
}

// =============================
// FUNÇÕES DE WARNS E BLACKLIST
// =============================

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
      
      for (const p of metadata.participants) {
        if (p.id === userJid || p.lid === userJid || p.jid === userJid) {
          if (p.jid && p.jid.includes('@s.whatsapp.net')) {
            return p.jid.split('@')[0];
          }
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
    
    // 4. Último recurso
    return userJid.split('@')[0];
    
  } catch (error) {
    console.error('Erro ao buscar número real:', error);
    return userJid.split('@')[0];
  }
}

async function addToBlacklist(socket, remoteJid, userJid, webMessage) {
  const blacklist = readBlacklist();
  
  const phoneNumber = await findRealPhoneNumber(socket, remoteJid, userJid, webMessage);
  const isLidOnly = phoneNumber.length > 15;
  
  const userData = {
    addedAt: new Date().toISOString(),
    number: phoneNumber,
    originalJid: userJid,
    isLidOnly: isLidOnly
  };
  
  blacklist[userJid] = userData;
  
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
  
  if (blacklist[userJid]) {
    return true;
  }
  
  const number = onlyNumbers(userJid);
  const standardJid = `${number}@s.whatsapp.net`;
  
  if (blacklist[standardJid]) {
    return true;
  }
  
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

// =============================
// HANDLERS DE FIGURINHA
// =============================

async function handleStickerTrigger(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const buf = webMessage.message.stickerMessage.fileSha256;
    const stickerIdNumeric = Array.from(buf).join(",");

    if (!STICKER_TRIGGER_IDS.includes(stickerIdNumeric)) return;

    const remoteJid = webMessage.key.remoteJid;
    const senderJid = webMessage.key.participant;

    await socket.sendMessage(remoteJid, {
      react: { text: "⏳", key: webMessage.key }
    });

    let metadata;
    try {
      metadata = await socket.groupMetadata(remoteJid);
    } catch (e) {
      await socket.sendMessage(remoteJid, {
        react: { text: "❌", key: webMessage.key }
      });
      return;
    }

    const sender = metadata.participants.find(p =>
      p.id === senderJid || p.jid === senderJid
    );

    if (!sender?.admin && !isOwner(senderJid)) {
      await socket.sendMessage(remoteJid, {
        react: { text: "❌", key: webMessage.key }
      });
      return;
    }

    const participants = metadata.participants
      .map(p => p.id || p.jid)
      .filter(jid => jid && jid !== `${BOT_NUMBER}@s.whatsapp.net`);

    if (!participants.length) {
      await socket.sendMessage(remoteJid, {
        react: { text: "❌", key: webMessage.key }
      });
      return;
    }

    const groupName = metadata.subject || "Grupo";
    const text = `👥 *${groupName}*\n\n📢 *Figurinha chamando todos do grupo*`;

    await socket.sendMessage(remoteJid, {
      text,
      mentions: participants
    }, { quoted: webMessage });

    await socket.sendMessage(remoteJid, {
      react: { text: "✅", key: webMessage.key }
    });

  } catch (error) {
    try {
      await socket.sendMessage(webMessage.key.remoteJid, {
        react: { text: "❌", key: webMessage.key }
      });
    } catch {}
    errorLog("Erro no sticker tagall:", error);
  }
}

async function handleStickerDelete(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    if (!STICKER_DELETE_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do usuário para apagar*'
      });
      return;
    }

    const metadata = await socket.groupMetadata(remoteJid);
    const senderJid = webMessage.key.participant;
    const participant = metadata.participants.find(p => p.id === senderJid);

    if (!participant?.admin && !isOwner(senderJid)) {
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

    // Lê as figurinhas dinamicamente do banco fig-adv.json
    const STICKER_WARN_IDS = readAdvStickers();

    if (!STICKER_WARN_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do usuário para advertir*'
      });
      return;
    }

    const metadata = await socket.groupMetadata(remoteJid);
    const senderJid = webMessage.key.participant;
    const participant = metadata.participants.find(p => p.id === senderJid);

    if (!participant?.admin && !isOwner(senderJid)) {
      return;
    }

    const targetJid = contextInfo.participant;
    const targetNumber = onlyNumbers(targetJid);

    // Proteção: não pode advertir o dono do bot
    if ([String(OWNER_NUMBER), OWNER_LID.replace("@lid", "")].includes(targetNumber)) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode usar esta figurinha contra ADMs',
        mentions: [targetJid]
      });
      return;
    }

    // Proteção: não pode advertir o bot
    if (targetJid === `${BOT_NUMBER}@s.whatsapp.net`) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode usar esta figurinha contra ADMs',
        mentions: [targetJid]
      });
      return;
    }

    // Proteção: não pode advertir outros ADMs
    const isTargetAdmin = metadata.participants.some(
      p => p.id === targetJid && p.admin
    );
    if (isTargetAdmin) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode usar esta figurinha contra ADMs',
        mentions: [targetJid]
      });
      return;
    }

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

    if (!STICKER_MUTE_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do usuário para mutar*'
      });
      return;
    }

    const metadata = await socket.groupMetadata(remoteJid);
    const senderJid = webMessage.key.participant;
    const participant = metadata.participants.find(p => p.id === senderJid);

    if (!participant?.admin && !isOwner(senderJid)) {
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

    if (!STICKER_UNMUTE_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do usuário para desmutar*'
      });
      return;
    }

    const metadata = await socket.groupMetadata(remoteJid);
    const senderJid = webMessage.key.participant;
    const participant = metadata.participants.find(p => p.id === senderJid);

    if (!participant?.admin && !isOwner(senderJid)) {
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

    if (!STICKER_BLACKLIST_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque o alvo para enviar à lista negra*'
      });
      return;
    }

    const metadata = await socket.groupMetadata(remoteJid);
    const senderJid = webMessage.key.participant;
    const participant = metadata.participants.find(p => p.id === senderJid);

    if (!participant?.admin && !isOwner(senderJid)) {
      return;
    }

    const targetJid = contextInfo.participant;
    const targetNumber = onlyNumbers(targetJid);

    if ([OWNER_NUMBER, OWNER_LID.replace("@lid", "")].includes(targetNumber)) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode adicionar o dono do bot à lista negra!',
      });
      return;
    }

    if (targetJid === `${BOT_NUMBER}@s.whatsapp.net`) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode adicionar o bot à lista negra.',
      });
      return;
    }

    const isTargetAdmin = metadata.participants.some(
      p => p.id === targetJid && p.admin
    );

    if (isTargetAdmin) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode adicionar um administrador à lista negra.',
      });
      return;
    }

    if (isBlacklisted(targetJid)) {
      await socket.sendMessage(remoteJid, {
        text: `⚠️ @${targetNumber} já está na lista negra!`,
        mentions: [targetJid]
      });
      return;
    }

    await addToBlacklist(socket, remoteJid, targetJid, webMessage);

    await socket.sendMessage(remoteJid, {
      text: `🚫 @${targetNumber} foi adicionado à lista negra e será removido!\n\n_Este usuário não poderá mais participar de grupos onde o bot está presente._`,
      mentions: [targetJid]
    });

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

async function handleStickerPromote(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    if (!STICKER_PROMOTE_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do usuário que deseja promover*'
      });
      return;
    }

    const metadata = await socket.groupMetadata(remoteJid);
    const senderJid = webMessage.key.participant;
    const participant = metadata.participants.find(p => p.id === senderJid);

    if (!participant?.admin && !isOwner(senderJid)) {
      return;
    }

    const targetJid = contextInfo.participant;
    const targetNumber = onlyNumbers(targetJid);

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

    if (!STICKER_DEMOTE_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;
    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do administrador que deseja rebaixar*'
      });
      return;
    }

    const metadata = await socket.groupMetadata(remoteJid);
    const senderJid = webMessage.key.participant;
    const participant = metadata.participants.find(p => p.id === senderJid);

    if (!participant?.admin && !isOwner(senderJid)) {
      return;
    }

    const targetJid = contextInfo.participant;
    const targetNumber = onlyNumbers(targetJid);

    if ([OWNER_NUMBER, OWNER_LID.replace("@lid", "")].includes(targetNumber)) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Você não pode rebaixar o dono do bot!'
      });
      return;
    }

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

    if (!STICKER_ADMIN_ONLY_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;

    const metadata = await socket.groupMetadata(remoteJid);
    const senderJid = webMessage.key.participant;
    const participant = metadata.participants.find(
      p => p.id === senderJid
    );

    if (!participant?.admin && !isOwner(senderJid)) {
      return;
    }

    const isAdminOnly = metadata.announce === true;

    try {
      if (isAdminOnly) {
        await socket.groupSettingUpdate(remoteJid, "not_announcement");

        await socket.sendMessage(remoteJid, {
          text: "🔓 Grupo aberto! Todos podem enviar mensagens."
        });
      } else {
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

    if (!STICKER_TAG_ADM_IDS.includes(stickerIdNumeric)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;

    if (!remoteJid.endsWith("@g.us")) {
      return;
    }

    const metadata = await socket.groupMetadata(remoteJid);
    const groupName = metadata.subject || "este grupo";

    const admins = metadata.participants
      .filter(p => p.admin)
      .map(p => p.id);

    if (!admins.length) {
      await socket.sendMessage(remoteJid, {
        text: '❌ Não encontrei administradores neste grupo.'
      });
      return;
    }

    const mentionsText = admins
      .map(admin => `@${admin.split("@")[0]}`)
      .join(" ");

    const finalMessage =
`👮 *Chamando os ADMs*
🪀 Grupo: *${groupName}*

${mentionsText}`;

    await socket.sendMessage(remoteJid, {
      text: finalMessage,
      mentions: admins
    }, { quoted: webMessage });

  } catch (error) {
    console.error('Erro ao marcar admins por figurinha:', error);
  }
}

async function handleSmartStickers(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const remoteJid = webMessage.key.remoteJid;
    if (!remoteJid.endsWith("@g.us")) return;

    const buf = webMessage.message.stickerMessage.fileSha256;
    if (!buf) return;

    const stickerId = Array.from(buf).join(",");

    const messages = STICKER_SMART_MESSAGES[stickerId];
    if (!messages) return;

    const metadata = await socket.groupMetadata(remoteJid);
    const sender = webMessage.key.participant;

    const participant = metadata.participants.find(p => p.id === sender);
    if (!participant?.admin && !isOwner(sender)) return;

    const cacheKey = `${remoteJid}_${stickerId}`;

    let index = stickerMessageCache.get(cacheKey) || 0;

    const messageToSend = messages[index];

    index++;
    if (index >= messages.length) index = 0;

    stickerMessageCache.set(cacheKey, index);

    await socket.sendMessage(remoteJid, {
      text: messageToSend
    }, { quoted: webMessage });

  } catch (error) {
    console.log("Erro no sistema de figurinha inteligente:", error);
  }
}

async function handleStickerGroupLink(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    if (!STICKER_GROUP_LINK_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;

    if (!remoteJid.endsWith("@g.us")) return;

    const metadata = await socket.groupMetadata(remoteJid);
    const senderJid = webMessage.key.participant;
    const participant = metadata.participants.find(
      p => p.id === senderJid
    );

    if (!participant?.admin && !isOwner(senderJid)) {
      await socket.sendMessage(remoteJid, {
        text: "❌ Apenas administradores podem gerar o link do grupo."
      });
      return;
    }

    const inviteCode = await socket.groupInviteCode(remoteJid);
    if (!inviteCode) {
      await socket.sendMessage(remoteJid, {
        text: "❌ Preciso ser administrador para obter o link."
      });
      return;
    }

    const groupInviteLink = `https://chat.whatsapp.com/${inviteCode}`;
    const groupName = metadata.subject;

    const messageText =
      `*${groupName}*\n\nConvite para conversa em grupo\n\n${groupInviteLink}`;

    try {
      const profilePicUrl = await socket.profilePictureUrl(remoteJid, "image");

      if (profilePicUrl) {
        await socket.sendMessage(remoteJid, {
          image: { url: profilePicUrl },
          caption: messageText,
        }, { quoted: webMessage });
      } else {
        await socket.sendMessage(remoteJid, {
          text: messageText
        }, { quoted: webMessage });
      }
    } catch (profileError) {
      console.log("Não foi possível obter a foto do grupo:", profileError.message);

      await socket.sendMessage(remoteJid, {
        text: messageText
      }, { quoted: webMessage });
    }

  } catch (error) {
    console.error("Erro ao gerar link do grupo via figurinha:", error);
  }
}

async function handleStickerGroupDescription(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    if (!STICKER_GROUP_DESCRIPTION_IDS.includes(numericId)) {
      return;
    }

    const remoteJid = webMessage.key.remoteJid;

    if (!remoteJid.endsWith("@g.us")) return;

    const metadata = await socket.groupMetadata(remoteJid);
    const senderJid = webMessage.key.participant;
    const participant = metadata.participants.find(
      p => p.id === senderJid
    );

    if (!participant?.admin && !isOwner(senderJid)) {
      return;
    }

    const descricao = metadata?.desc;

    if (!descricao || descricao.trim() === "") {
      await socket.sendMessage(remoteJid, {
        text: "⚠️ Este grupo não possui descrição definida."
      });
      return;
    }

    let fotoGrupo;
    try {
      fotoGrupo = await socket.profilePictureUrl(remoteJid, "image");
    } catch {
      fotoGrupo = null;
    }

    if (fotoGrupo) {
      await socket.sendMessage(remoteJid, {
        image: { url: fotoGrupo },
        caption: `🚨 *Regras do grupo 🚨*\n\n${descricao}`
      });
    } else {
      await socket.sendMessage(remoteJid, {
        text: `🚨 *Regras do grupo 🚨*\n\n${descricao}`
      });
    }

  } catch (error) {
    console.error("Erro ao puxar descrição do grupo:", error);
  }
}

exports.messageHandler = async (socket, webMessage) => {
  try {
    if (!webMessage?.key) return;

    const { remoteJid, fromMe, id: messageId } = webMessage.key;
    if (fromMe) return;

    const userJid = webMessage.key?.participant;
    if (!userJid) return;

    const isBot =
  compareUserJidWithOtherNumber({ userJid, otherNumber: BOT_NUMBER });

    if (isBot) return;

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
    await handleSmartStickers(socket, webMessage);
    await handleStickerGroupLink(socket, webMessage);
    await handleStickerGroupDescription(socket, webMessage);

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
