/**
 * Evento chamado quando um usuário
 * entra ou sai de um grupo de WhatsApp.
 * ATUALIZADO: Suporta @lid (novo formato WhatsApp) + pushName via webMessage
 *
 * @author Dev VaL
 */
const fs = require("node:fs");
const path = require("path");
const { getProfileImageData } = require("../services/baileys");
const { onlyNumbers, getRandomNumber } = require("../utils");
const {
  isActiveWelcomeGroup,
  isActiveExitGroup,
  isActiveGroup,
} = require("../utils/database");
const { welcomeMessage, exitMessage } = require("../messages");
const {
  spiderAPITokenConfigured,
  exit,
  welcome,
} = require("../services/spider-x-api");
const { upload } = require("../services/upload");

// 🎉 WELCOME2 - Sistema de boas-vindas com foto do membro
const { handleWelcome2NewMember } = require("../utils/welcome2Handler");

// 🎉 WELCOME3 - Sistema de boas-vindas com foto do grupo
const { handleWelcome3NewMember } = require("../utils/welcome3Handler");

// 🎉 WELCOME4 - Sistema de boas-vindas apenas com texto (sem foto)
const { handleWelcome4NewMember } = require("../utils/welcome4Handler");

// 🚫 LISTA NEGRA - Funções para banimento automático (ATUALIZADO PARA @LID)
const BLACKLIST_FILE = path.join(__dirname, '..', 'data', 'blacklist.json');

function loadBlacklist() {
  try {
    if (!fs.existsSync(BLACKLIST_FILE)) {
      return {};
    }
    const data = fs.readFileSync(BLACKLIST_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[BLACKLIST] Erro ao carregar lista negra:', error);
    return {};
  }
}

// 🆕 Extrai o identificador único do JID (suporta @s.whatsapp.net e @lid)
function extractUserId(jid) {
  if (!jid) return null;
  
  // Se é LID (novo formato)
  if (jid.includes('@lid')) {
    return jid.split('@')[0];
  }
  
  // Se é formato antigo
  if (jid.includes('@s.whatsapp.net')) {
    return jid.split('@')[0];
  }
  
  // Se já é só o número/ID
  return jid;
}

async function checkAndBanBlacklistedUser(socket, remoteJid, userJid) {
  try {
    const blacklist = loadBlacklist();
    
    // Verifica se o grupo tem lista negra
    if (!blacklist[remoteJid] || blacklist[remoteJid].length === 0) {
      return false;
    }

    // 🆕 Extrai o ID único (funciona com @s.whatsapp.net e @lid)
    const userId = extractUserId(userJid);
    
    if (!userId) {
      console.log(`[BLACKLIST] Não foi possível extrair userId de: ${userJid}`);
      return false;
    }
    
    // Verifica se o usuário está na lista negra
    if (blacklist[remoteJid].includes(userId)) {
      console.log(`[BLACKLIST] Detectado usuário ${userId} (${userJid}) na lista negra do grupo ${remoteJid}`);
      
      try {
        // Bane o usuário imediatamente usando o JID completo
        await socket.groupParticipantsUpdate(remoteJid, [userJid], 'remove');
        
        // 🆕 Formata a exibição do ID de forma amigável
        let displayId = userId;
        if (userId.length > 15) {
          displayId = `LID: ${userId.substring(0, 12)}...`;
        } else if (userId.startsWith('55') && userId.length >= 12) {
          displayId = userId.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3');
        } else {
          displayId = `+${userId}`;
        }
        
        const banMessage = 
          `🚫 *BANIMENTO AUTOMÁTICO*\n\n` +
          `👤 *Usuário:* ${displayId}\n` +
          `🆔 *ID:* ${userId}\n` +
          `📋 *Tipo:* ${userJid.includes('@lid') ? 'LID' : 'Número'}\n` +
          `⚠️ *Motivo:* Usuário está na lista negra\n` +
          `🔒 *Ação:* Banido automaticamente\n\n` +
          `💡 Para remover da lista negra, use #lista-negra-remover`;
        
        await socket.sendMessage(remoteJid, { text: banMessage });
        
        console.log(`[BLACKLIST] Usuário ${userId} banido automaticamente do grupo ${remoteJid}`);
        return true;
        
      } catch (error) {
        console.error(`[BLACKLIST] Erro ao banir usuário ${userId}:`, error);
        
        // Se falhar ao banir, avisa os admins
        try {
          const warningMessage = 
            `⚠️ *ALERTA - LISTA NEGRA*\n\n` +
            `👤 *Usuário ID:* ${userId}\n` +
            `🚨 *Status:* Na lista negra mas não foi possível banir automaticamente\n` +
            `💡 *Ação recomendada:* Bana manualmente ou verifique as permissões do bot`;
          
          await socket.sendMessage(remoteJid, { text: warningMessage });
        } catch (msgError) {
          console.error('[BLACKLIST] Erro ao enviar mensagem de aviso:', msgError);
        }
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('[BLACKLIST] Erro no checkAndBanBlacklistedUser:', error);
    return false;
  }
}

exports.onGroupParticipantsUpdate = async ({
  userJid,
  remoteJid,
  socket,
  action,
  webMessage,
}) => {
  try {
    if (!remoteJid.endsWith("@g.us")) {
      return;
    }

    if (!isActiveGroup(remoteJid)) {
      return;
    }

    if (action === "add") {
      // 🚫 VERIFICAÇÃO DE LISTA NEGRA - Primeira prioridade!
      const wasBanned = await checkAndBanBlacklistedUser(socket, remoteJid, userJid);
      if (wasBanned) {
        console.log(`[BLACKLIST] Usuário banido, pulando mensagens de boas-vindas`);
        return;
      }

      // 🆕 Obtém pushname e userNumber uma única vez (reutilizado por todos os sistemas)
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const userNumber = extractUserId(userJid);
      
      let pushname = webMessage?.pushName || null;
      if (!pushname) {
        try {
          if (socket.store && socket.store.contacts && socket.store.contacts[userJid]) {
            pushname = socket.store.contacts[userJid].name || socket.store.contacts[userJid].notify;
          }
          
          if (!pushname) {
            const participant = groupMetadata.participants.find(p => p.id === userJid);
            if (participant) {
              pushname = participant.notify || participant.verifiedName || participant.name;
            }
          }
          
          if (!pushname && socket.authState?.creds?.contacts) {
            const contact = socket.authState.creds.contacts[userJid];
            if (contact) {
              pushname = contact.notify || contact.name;
            }
          }
          
          // 🆕 Fallback final para "Novo Membro"
          if (!pushname) {
            pushname = "Novo Membro";
          }
        } catch (error) {
          pushname = "Novo Membro";
        }
      }

      // 🎉 WELCOME2 - Sistema com foto do membro
      try {
        await handleWelcome2NewMember({
          groupId: remoteJid,
          groupName: groupMetadata.subject,
          newMemberId: userJid,
          newMemberNumber: userNumber,
          pushname: pushname,
          sendImageWithCaption: async ({ image, caption, mentions }) => {
            await socket.sendMessage(remoteJid, {
              image: { url: image },
              caption: caption,
              mentions: mentions
            });
          },
          sendTextWithMention: async ({ caption, mentions }) => {
            await socket.sendMessage(remoteJid, {
              text: caption,
              mentions: mentions
            });
          },
          getProfilePicture: async (userId) => {
            try {
              return await socket.profilePictureUrl(userId, 'image');
            } catch (error) {
              return null;
            }
          }
        });
      } catch (error) {
        console.error('[WELCOME2] ❌ Erro:', error.message);
      }

      // 🎉 WELCOME3 - Sistema com foto do grupo
      try {
        await handleWelcome3NewMember({
          groupId: remoteJid,
          groupName: groupMetadata.subject,
          newMemberId: userJid,
          newMemberNumber: userNumber,
          pushname: pushname,
          sendImageWithCaption: async ({ image, caption, mentions }) => {
            await socket.sendMessage(remoteJid, {
              image: { url: image },
              caption: caption,
              mentions: mentions
            });
          },
          sendTextWithMention: async ({ caption, mentions }) => {
            await socket.sendMessage(remoteJid, {
              text: caption,
              mentions: mentions
            });
          },
          getGroupPicture: async (groupId) => {
            try {
              return await socket.profilePictureUrl(groupId, 'image');
            } catch (error) {
              return null;
            }
          }
        });
      } catch (error) {
        console.error('[WELCOME3] ❌ Erro:', error.message);
      }

      // 🎉 WELCOME4 - Sistema apenas com texto (sem foto)
      try {
        await handleWelcome4NewMember({
          groupId: remoteJid,
          groupName: groupMetadata.subject,
          newMemberId: userJid,
          newMemberNumber: userNumber,
          pushname: pushname,
          sendTextWithMention: async ({ caption, mentions }) => {
            await socket.sendMessage(remoteJid, {
              text: caption,
              mentions: mentions
            });
          }
        });
      } catch (error) {
        console.error('[WELCOME4] ❌ Erro:', error.message);
      }
    }

    // 🎉 SISTEMA WELCOME PADRÃO (mantido como estava)
    if (isActiveWelcomeGroup(remoteJid) && action === "add") {
      const { buffer, profileImage } = await getProfileImageData(
        socket,
        userJid
      );

      const hasMemberMention = welcomeMessage.includes("@member");
      const mentions = [];

      let finalWelcomeMessage = welcomeMessage;

      if (hasMemberMention) {
        finalWelcomeMessage = welcomeMessage.replace(
          "@member",
          `@${onlyNumbers(userJid)}`
        );
        mentions.push(userJid);
      }

      if (spiderAPITokenConfigured) {
        try {
          if (!buffer) {
            await socket.sendMessage(remoteJid, {
              image: buffer,
              caption: finalWelcomeMessage,
              mentions,
            });
            return;
          }

          const link = await upload(
            buffer,
            `${getRandomNumber(10_000, 99_9999)}.png`
          );

          if (!link) {
            throw new Error(
              "Não consegui fazer o upload da imagem, tente novamente mais tarde!"
            );
          }

          const url = welcome(
            "participante",
            "Você é o mais novo membro do grupo!",
            link
          );

          await socket.sendMessage(remoteJid, {
            image: { url },
            caption: finalWelcomeMessage,
            mentions,
          });
        } catch (error) {
          console.error("Erro ao fazer upload da imagem:", error);
          await socket.sendMessage(remoteJid, {
            image: buffer,
            caption: finalWelcomeMessage,
            mentions,
          });
        }
      } else {
        await socket.sendMessage(remoteJid, {
          image: buffer,
          caption: finalWelcomeMessage,
          mentions,
        });
      }

      if (!profileImage.includes("default-user")) {
        fs.unlinkSync(profileImage);
      }
    } else if (isActiveExitGroup(remoteJid) && action === "remove") {
      const { buffer, profileImage } = await getProfileImageData(
        socket,
        userJid
      );

      const hasMemberMention = exitMessage.includes("@member");
      const mentions = [];

      let finalExitMessage = exitMessage;

      if (hasMemberMention) {
        finalExitMessage = exitMessage.replace(
          "@member",
          `@${onlyNumbers(userJid)}`
        );
        mentions.push(userJid);
      }

      if (spiderAPITokenConfigured) {
        try {
          const link = await upload(
            buffer,
            `${getRandomNumber(10_000, 99_9999)}.png`
          );

          if (!link) {
            throw new Error(
              "Não consegui fazer o upload da imagem, tente novamente mais tarde!"
            );
          }

          const url = exit("membro", "Você foi um bom membro", link);

          await socket.sendMessage(remoteJid, {
            image: { url },
            caption: finalExitMessage,
            mentions,
          });
        } catch (error) {
          console.error("Erro ao fazer upload da imagem:", error);
          await socket.sendMessage(remoteJid, {
            image: buffer,
            caption: finalExitMessage,
            mentions,
          });
        }
      } else {
        await socket.sendMessage(remoteJid, {
          image: buffer,
          caption: finalExitMessage,
          mentions,
        });
      }

      if (!profileImage.includes("default-user")) {
        fs.unlinkSync(profileImage);
      }
    }
  } catch (error) {
    console.error("Erro ao processar evento onGroupParticipantsUpdate:", error);
    process.exit(1);
  }
};