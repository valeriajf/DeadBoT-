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
  "49,89,77,98,153,216,193,8,246,54,39,184,201,25,118,55,162,77,163,108,73,176,232,149,215,47,55,228,73,75,106,56",
];

// Lista de figurinhas que puxam a descrição do grupo
const STICKER_GROUP_DESCRIPTION_IDS = [
  "187,223,188,200,46,231,131,168,44,24,74,108,36,14,200,247,229,232,146,8,190,143,2,102,152,215,114,75,233,175,210,254",
  
];

// =============================
// SISTEMA DE FIGURINHAS INTELIGENTES
// =============================

// cache rotativo por grupo + figurinha
const stickerMessageCache = new Map();

// IDs das figurinhas (SHA256)
const STICKER_SMART_MESSAGES = {

  // 🌅 MANHÃ (10 mensagens)
  "156,130,78,142,242,52,231,110,173,104,35,67,188,39,112,22,228,78,19,58,131,234,43,164,203,133,34,4,18,142,35,167": [
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
  "45,219,249,218,38,56,63,197,201,200,75,179,142,166,35,215,224,160,33,232,57,177,209,193,113,232,69,126,139,221,139,202": [
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
  "75,43,5,214,77,68,223,148,190,66,86,148,91,233,82,127,0,217,13,179,183,50,49,173,211,232,135,67,141,40,247,157": [
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
  "73,150,131,182,10,144,110,215,205,147,67,56,58,153,244,108,110,113,222,138,9,36,80,218,124,213,137,86,29,180,106,176": [
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
  
  // 💀 DEADPOOL (10 mensagens)
 "112,177,9,226,185,240,67,5,11,183,199,59,210,4,41,144,161,47,165,250,134,22,255,104,231,48,194,181,166,76,0,139": [
    "💀 Olha quem apareceu... Eu mesmo. O anti-herói favorito do grupo 😎",
    "🔫 Calma, eu não resolvo tudo na bala… às vezes é só no sarcasmo mesmo.",
    "😏 Relaxa grupo, eu estou aqui. Agora tudo vai dar errado… digo, certo!",
    "🩸 Se o caos tivesse um representante, provavelmente seria eu.",
    "🎭 Herói? Vilão? Eu prefiro 'problema bem-humorado'.",
    "🔥 Vim trazer ordem... ou pelo menos entretenimento.",
    "💬 Falaram meu nome 3 vezes? Então pronto, apareci.",
    "💣 Cuidado grupo… nível de zoeira aumentado.",
    "😈 Eu não sou o herói que vocês merecem… mas sou o que apareceu.",
    "🗡️ Tranquilos, hoje eu estou de bom humor. Acho."
  ],

  // 📢 PROPAGANDA
  "46,236,42,124,67,226,113,152,9,74,125,190,81,113,231,122,52,9,48,194,76,105,121,225,255,28,21,218,193,245,252,226": [
    "📢 *Gostou do DeadBoT? Entre em contato para alugar e transformar seu grupo*"
  ]
};

// Lista de figurinhas que disparam o tagall
const STICKER_TRIGGER_IDS = [
  "237,240,88,140,212,171,71,87,143,170,31,4,161,59,231,26,145,206,63,43,179,14,239,118,100,145,78,161,21,50,181,188",
  
  "227,2,178,16,230,157,98,114,129,2,96,110,160,98,30,56,152,65,8,32,147,236,62,49,147,235,170,116,161,151,222,127",
  
  "74,136,209,171,160,196,81,112,218,236,146,215,180,206,153,154,238,90,73,46,43,22,97,156,64,34,55,66,155,253,26,70",
  
  "111,114,242,97,190,202,138,117,213,118,3,3,160,121,2,8,92,174,94,210,95,54,226,143,137,89,80,83,26,175,14,170"
  
];

// Lista de figurinhas que deletam mensagens
const STICKER_DELETE_IDS = [
  "116,213,61,242,230,38,197,223,181,198,112,103,52,199,114,255,136,240,128,68,156,176,53,156,58,169,52,220,3,16,244,130",
];

// Lista de figurinhas que mutam usuários
const STICKER_MUTE_IDS = [
  "197,16,197,210,171,39,84,66,25,238,253,42,123,45,107,202,143,85,218,213,72,98,119,132,2,139,53,124,81,153,65,225",
];

// Lista de figurinhas que desmutam usuários
const STICKER_UNMUTE_IDS = [
  "192,200,27,99,228,0,224,77,234,138,111,147,50,168,141,210,157,108,36,139,147,192,196,24,17,34,22,239,200,243,222,70",
];

// Lista de figurinhas que adicionam à lista negra
const STICKER_BLACKLIST_IDS = [
  "202,161,227,121,90,112,118,71,65,255,221,224,86,159,175,233,43,3,12,254,6,115,24,79,246,236,101,120,129,162,83,238",
];

// Lista de figurinhas que promovem usuários a ADM
const STICKER_PROMOTE_IDS = [
  "214,102,92,226,93,178,166,88,148,196,81,59,156,74,21,139,130,182,161,227,238,124,65,186,213,196,129,125,184,47,165,54",
  
  "171,103,104,183,109,1,141,190,14,207,143,27,184,65,8,25,225,114,40,45,4,114,173,218,189,26,60,159,235,12,104,83",
  
];

// Lista de figurinhas que rebaixam administradores
const STICKER_DEMOTE_IDS = [
  "180,64,241,130,90,132,158,242,136,19,105,92,191,105,159,174,219,56,75,52,134,97,71,102,116,7,204,48,34,117,190,46",
  
  "159,82,7,144,107,246,248,42,175,118,45,169,92,78,104,151,104,43,126,148,74,72,48,84,166,215,18,242,99,163,149,144",
  
];

// Lista de figurinhas que ativam/desativam modo admin-only
const STICKER_ADMIN_ONLY_IDS = [
  "23,137,241,95,114,252,174,111,25,18,169,230,67,164,217,102,189,205,255,20,20,117,51,56,206,200,98,151,211,71,212,147",
  
  "186,37,108,2,149,216,249,69,122,5,199,119,118,67,124,230,81,29,181,185,84,152,209,61,81,44,218,148,80,83,13,222",
  
];

// Lista de figurinhas que marcam todos os administradores
const STICKER_TAG_ADM_IDS = [
  "112,107,65,166,188,40,75,146,149,18,253,243,9,25,138,29,5,66,159,22,151,139,98,143,40,228,194,171,72,81,237,176",
  
  "182,10,14,66,170,139,57,225,109,166,106,176,223,131,179,138,134,173,130,82,85,175,119,41,150,125,210,135,226,14,118,212",
  
  "214,153,62,119,41,205,21,107,209,181,154,50,73,82,205,55,27,186,15,166,152,195,252,145,224,105,153,39,217,36,88,24",
  
  "115,133,61,19,40,119,139,146,26,249,121,173,234,107,122,195,5,24,117,49,18,132,230,189,191,60,49,105,176,21,200,16",
  
  "173,16,123,218,32,130,214,68,166,153,108,58,225,93,226,35,214,160,13,231,64,89,1,158,185,136,224,59,120,233,0,50",
  
  "171,189,187,2,5,115,59,25,90,249,4,108,215,150,78,124,4,149,37,127,189,61,239,174,164,104,186,143,199,188,247,163",
  
];

// =============================
// FIGURINHAS DE ANIVERSÁRIO
// Cole os IDs aqui após usar o #get-sticker
// =============================
const STICKER_BIRTHDAY_IDS = [
  "139,215,18,180,251,46,208,76,103,43,59,13,96,20,150,233,156,171,39,165,17,196,251,34,213,73,237,64,52,16,128,182",

  "66,228,32,154,83,211,7,23,143,60,78,70,80,112,219,28,170,7,208,161,252,205,92,58,148,27,202,245,224,76,86,97",
  
  "237,196,168,72,218,80,192,75,250,40,231,150,244,120,252,246,132,83,193,66,143,135,40,235,11,74,201,143,41,79,1,252",
  
  "60,148,244,101,224,55,217,57,247,251,126,186,245,204,142,146,107,218,37,100,242,202,153,247,100,42,73,91,127,123,107,193",

];

// Mensagens rotativas de aniversário
// {nome} será substituído pelo nome real da pessoa marcada
const BIRTHDAY_MESSAGES = [
  "🎂 Parabéns, {nome}! Que seu dia seja repleto de alegria e felicidade! 🎉",
  "🥳 Feliz aniversário, {nome}! Que todos os seus sonhos se realizem! 🌟",
  "🎈 Hoje é dia de {nome}! Parabéns! Que venham muitos anos mais! 🎊",
  "🎁 Muitas felicidades pra você, {nome}! Hoje é o seu dia especial! 💛",
  "🎉 Parabéns, {nome}! Que Deus abençoe cada passo da sua vida! 🙏",
  "🌟 Feliz aniversário, {nome}! Saúde, paz e muito sucesso! 🚀",
  "🥂 Hoje é aniversário de {nome}! O grupo inteiro celebra com você! 🎂",
  "🎊 Parabéns, {nome}! Que este novo ano de vida seja incrível! ✨",
  "💫 Feliz aniversário, {nome}! Que a vida te reserve coisas lindas! 🌻",
  "🎂 O DeadBoT deseja um feliz aniversário pra {nome}! Viva! 🎉",
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

// =============================
// HANDLER DE ANIVERSÁRIO
// Responde com mensagem rotativa puxando o nome da pessoa marcada
// =============================
async function handleStickerBirthday(socket, webMessage) {
  try {
    if (!webMessage.message?.stickerMessage) return;

    // Se a lista estiver vazia, não faz nada
    if (!STICKER_BIRTHDAY_IDS.length) return;

    const fileSha = webMessage.message.stickerMessage.fileSha256;
    if (!fileSha || fileSha.length === 0) return;

    const buf = Buffer.from(fileSha);
    const numericId = Array.from(buf).join(",");

    if (!STICKER_BIRTHDAY_IDS.includes(numericId)) return;

    const remoteJid = webMessage.key.remoteJid;
    if (!remoteJid.endsWith("@g.us")) return;

    const contextInfo = webMessage.message.stickerMessage.contextInfo;

    // Precisa marcar alguém
    if (!contextInfo || !contextInfo.stanzaId || !contextInfo.participant) {
      await socket.sendMessage(remoteJid, {
        text: '🎯 *Marque a mensagem do aniversariante para parabenizá-lo!*'
      });
      return;
    }

    // Apenas ADM pode usar
    const metadata = await socket.groupMetadata(remoteJid);
    const senderJid = webMessage.key.participant;
    const senderParticipant = metadata.participants.find(p => p.id === senderJid);

    if (!senderParticipant?.admin && !isOwner(senderJid)) return;

    const targetJid = contextInfo.participant;

    // Busca o participante nos metadados — resolve LID para JID real (@s.whatsapp.net)
    const targetParticipant = metadata.participants.find(
      p => p.id === targetJid || p.lid === targetJid
    );

    // JID real para o mentions (precisa ser @s.whatsapp.net para a menção ser clicável)
    const realJid = (targetParticipant?.id?.includes('@s.whatsapp.net'))
      ? targetParticipant.id
      : targetJid;

    // Número limpo para o @menção no texto (igual ao criar-rank)
    const mentionNumber = realJid.split('@')[0];

    // Mensagem rotativa por grupo (cache independente das smart stickers)
    const cacheKey = `birthday_${remoteJid}`;
    let index = stickerMessageCache.get(cacheKey) || 0;
    const template = BIRTHDAY_MESSAGES[index];
    index = (index + 1) % BIRTHDAY_MESSAGES.length;
    stickerMessageCache.set(cacheKey, index);

    // Substitui {nome} por @NUMERO — WhatsApp converte em menção clicável
    // desde que o JID real esteja no array mentions
    const finalMessage = template.replace("{nome}", `@${mentionNumber}`);

    await socket.sendMessage(remoteJid, {
      text: finalMessage,
      mentions: [realJid]
    }, { quoted: webMessage });

  } catch (error) {
    console.error("Erro no sticker de aniversário:", error);
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
    await handleStickerBirthday(socket, webMessage);
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
