/**
 * Evento chamado quando um usuário entra ou sai de um grupo de WhatsApp.
 * Suporta: WELCOME1–7, EXIT padrão, EXIT2, sistema de blacklist e X9 Monitor.
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
  isActiveX9Monitor,
  addX9Log,
} = require("../utils/database");
const { welcomeMessage, exitMessage } = require("../messages");
const {
  spiderAPITokenConfigured,
  exit,
  welcome,
} = require("../services/spider-x-api");
const { upload } = require("../services/upload");
const { handleWelcome2NewMember } = require("../utils/welcome2Handler");
const { handleWelcome3NewMember } = require("../utils/welcome3Handler");
const { handleWelcome4NewMember } = require("../utils/welcome4Handler");
const { handleWelcome5NewMember } = require("../utils/welcome5Handler");
const { handleWelcome6NewMember } = require("../utils/welcome6Handler");
const { handleWelcome7NewMember } = require("../utils/welcome7Handler");

const BLACKLIST_FILE = path.join(__dirname, "..", "data", "blacklist.json");

// Cache para evitar processamento duplicado do mesmo evento
const processedEvents = new Map();
const EVENT_CACHE_TTL = 5000; // 5 segundos

function isEventProcessed(remoteJid, userJid, action) {
  const key = `${remoteJid}:${userJid}:${action}`;
  const now = Date.now();
  
  if (processedEvents.has(key)) {
    const timestamp = processedEvents.get(key);
    if (now - timestamp < EVENT_CACHE_TTL) {
      return true; // Evento já foi processado recentemente
    }
  }
  
  // Marca evento como processado
  processedEvents.set(key, now);
  
  // Limpa eventos antigos do cache
  for (const [k, time] of processedEvents.entries()) {
    if (now - time > EVENT_CACHE_TTL) {
      processedEvents.delete(k);
    }
  }
  
  return false;
}

function loadBlacklist() {
  try {
    if (!fs.existsSync(BLACKLIST_FILE)) return {};
    const data = fs.readFileSync(BLACKLIST_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function extractUserId(jid) {
  if (!jid) return null;
  if (jid.includes("@lid")) return jid.split("@")[0];
  if (jid.includes("@s.whatsapp.net")) return jid.split("@")[0];
  return jid;
}

async function checkAndBanBlacklistedUser(socket, remoteJid, userJid) {
  try {
    const blacklist = loadBlacklist();
    if (!blacklist[remoteJid] || blacklist[remoteJid].length === 0) return false;
    const userId = extractUserId(userJid);
    if (!userId) return false;

    if (blacklist[remoteJid].includes(userId)) {
      await socket.groupParticipantsUpdate(remoteJid, [userJid], "remove");
      const banMessage =
        `🚫 *BANIMENTO AUTOMÁTICO*\n\n` +
        `👤 *Usuário:* ${userId}\n` +
        `⚠️ *Motivo:* Está na lista negra\n` +
        `🔒 *Ação:* Banido automaticamente\n`;
      await socket.sendMessage(remoteJid, { text: banMessage });
      return true;
    }
    return false;
  } catch {
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
    if (!remoteJid.endsWith("@g.us")) return;
    if (!isActiveGroup(remoteJid)) return;

    // Proteção contra eventos duplicados
    if (isEventProcessed(remoteJid, userJid, action)) {
      return;
    }

    // ====================================
    // 🕵️ X9 MONITOR - Captura de ações ADM
    // ====================================
    try {
      if (isActiveX9Monitor(remoteJid)) {
        let adminJid = webMessage?.participant || 
                       webMessage?.key?.participant || 
                       webMessage?.author ||
                       null;
        
        if (!adminJid && action === "promote") {
          try {
            const groupMetadata = await socket.groupMetadata(remoteJid);
            const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
            adminJid = admins[0] || "Sistema";
          } catch {
            adminJid = "Sistema";
          }
        }
        
        const adminPhone = adminJid && adminJid !== "Sistema" ? adminJid.split("@")[0] : "Sistema";
        const targetPhone = userJid.split("@")[0];
        
        let actionType = null;
        let emoji = null;
        let actionText = null;
        let description = null;
        
        switch(action) {
          case "promote":
            actionType = 'promote';
            emoji = '⬆️';
            actionText = 'Promoção detectada!';
            description = `@${adminPhone} promoveu @${targetPhone} a administrador`;
            break;
            
          case "demote":
            actionType = 'demote';
            emoji = '⬇️';
            actionText = 'Rebaixamento detectado!';
            description = `@${adminPhone} rebaixou @${targetPhone} de administrador`;
            break;
            
          case "add":
            actionType = 'approve';
            emoji = '✅';
            actionText = 'Entrada aprovada!';
            description = `@${adminPhone} aprovou entrada de @${targetPhone}`;
            break;
            
          case "remove":
            if (adminJid && adminJid !== "Sistema" && adminJid !== userJid) {
              actionType = 'remove';
              emoji = '🚪';
              actionText = 'Remoção detectada!';
              description = `@${adminPhone} removeu @${targetPhone} do grupo`;
            }
            break;
        }
        
        if (actionType) {
          await addX9Log(remoteJid, {
            adminJid: adminJid || "Sistema",
            adminPhone,
            targetJid: userJid,
            targetPhone,
            action: actionType,
            description
          });
          
          const mentions = adminJid && adminJid !== "Sistema" ? [adminJid, userJid] : [userJid];
          await socket.sendMessage(remoteJid, {
            text: `🕵️ *ALERTA X9*\n\n` +
                  `${emoji} *${actionText}*\n` +
                  `👤 Admin: @${adminPhone}\n` +
                  `🎯 Alvo: @${targetPhone}\n` +
                  `⏰ ${new Date().toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                  })}`,
            mentions
          });
        }
      }
    } catch (err) {
      console.error("[X9 MONITOR] Erro:", err.message);
    }

    // EXIT2
    try {
      const EXIT2_PATH = path.join(__dirname, "../database/exit-messages.json");
      if (action === "remove" || action === "leave") {
        if (fs.existsSync(EXIT2_PATH)) {
          const data = JSON.parse(fs.readFileSync(EXIT2_PATH, "utf8") || "{}");
          const groupExit = data[remoteJid];
          if (groupExit && groupExit.active) {
            const userNumber = userJid.split("@")[0];
            
            let userName = "Membro";
            try {
              if (webMessage?.pushName) {
                userName = webMessage.pushName;
              } else if (socket.store?.contacts?.[userJid]) {
                userName =
                  socket.store.contacts[userJid].name ||
                  socket.store.contacts[userJid].notify ||
                  userNumber;
              } else {
                userName = userNumber;
              }
            } catch {
              userName = userNumber;
            }

            let message = groupExit.message || "👋 {membro} saiu do grupo!";
            message = message.replace(/{membro}/g, `@${userNumber}`);

            await socket.sendMessage(remoteJid, {
              text: message,
              mentions: [userJid],
            });
          }
        }
      }
    } catch (err) {
      console.error("[EXIT2] Erro ao processar saída:", err);
    }

    // EXIT
    if (isActiveExitGroup(remoteJid) && action === "remove") {
      try {
        const { buffer, profileImage } = await getProfileImageData(socket, userJid);
        const hasMemberMention = exitMessage.includes("@member");
        const mentions = [];
        let finalExitMessage = exitMessage;

        if (hasMemberMention) {
          finalExitMessage = exitMessage.replace("@member", `@${onlyNumbers(userJid)}`);
          mentions.push(userJid);
        }

        if (spiderAPITokenConfigured) {
          try {
            const link = await upload(
              buffer,
              `${getRandomNumber(10_000, 99_9999)}.png`
            );
            const url = exit("membro", "Você foi um bom membro", link);
            await socket.sendMessage(remoteJid, {
              image: { url },
              caption: finalExitMessage,
              mentions,
            });
          } catch {
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

        if (!profileImage.includes("default-user")) fs.unlinkSync(profileImage);
      } catch (err) {
        console.error("[EXIT] Erro:", err);
      }
    }

    if (action === "add") {
      const wasBanned = await checkAndBanBlacklistedUser(socket, remoteJid, userJid);
      if (wasBanned) return;

      const groupMetadata = await socket.groupMetadata(remoteJid);
      const userNumber = extractUserId(userJid);
      let pushname = webMessage?.pushName || "Novo Membro";

      try {
        if (socket.store?.contacts?.[userJid]) {
          pushname =
            socket.store.contacts[userJid].name ||
            socket.store.contacts[userJid].notify ||
            pushname;
        }
      } catch {
        pushname = "Novo Membro";
      }

      // WELCOME2
      try {
        await handleWelcome2NewMember({
          groupId: remoteJid,
          groupName: groupMetadata.subject,
          newMemberId: userJid,
          newMemberNumber: userNumber,
          pushname,
          sendImageWithCaption: async ({ image, caption, mentions }) =>
            await socket.sendMessage(remoteJid, {
              image: { url: image },
              caption,
              mentions,
            }),
          sendTextWithMention: async ({ caption, mentions }) =>
            await socket.sendMessage(remoteJid, { text: caption, mentions }),
          getProfilePicture: async (userId) => {
            try {
              return await socket.profilePictureUrl(userId, "image");
            } catch {
              return null;
            }
          },
        });
      } catch {}

      // WELCOME3
      try {
        await handleWelcome3NewMember({
          groupId: remoteJid,
          groupName: groupMetadata.subject,
          newMemberId: userJid,
          newMemberNumber: userNumber,
          pushname,
          sendImageWithCaption: async ({ image, caption, mentions }) =>
            await socket.sendMessage(remoteJid, {
              image: { url: image },
              caption,
              mentions,
            }),
          sendTextWithMention: async ({ caption, mentions }) =>
            await socket.sendMessage(remoteJid, { text: caption, mentions }),
          getGroupPicture: async (groupId) => {
            try {
              return await socket.profilePictureUrl(groupId, "image");
            } catch {
              return null;
            }
          },
        });
      } catch {}

      // WELCOME4
      try {
        await handleWelcome4NewMember({
          groupId: remoteJid,
          groupName: groupMetadata.subject,
          newMemberId: userJid,
          newMemberNumber: userNumber,
          pushname,
          sendTextWithMention: async ({ caption, mentions }) =>
            await socket.sendMessage(remoteJid, { text: caption, mentions }),
        });
      } catch {}

      // WELCOME5
      try {
        await handleWelcome5NewMember({
          groupId: remoteJid,
          groupName: groupMetadata.subject,
          newMemberId: userJid,
          newMemberNumber: userNumber,
          pushname,
          sendGifFromFile: async (filePath, caption, mentions) => {
            const isGifOrMp4 = /\.(gif|mp4)$/i.test(filePath);
            
            if (isGifOrMp4) {
              await socket.sendMessage(remoteJid, {
                video: fs.readFileSync(filePath),
                caption,
                mentions,
                gifPlayback: true,
                mimetype: 'video/mp4'
              });
            } else {
              await socket.sendMessage(remoteJid, {
                image: fs.readFileSync(filePath),
                caption,
                mentions
              });
            }
          },
          sendTextWithMention: async ({ caption, mentions }) =>
            await socket.sendMessage(remoteJid, { text: caption, mentions }),
        });
      } catch (err) {
        console.error('[WELCOME5] Erro:', err.message);
      }
      
      // WELCOME6
      try {
        await handleWelcome6NewMember({
          groupId: remoteJid,
          groupName: groupMetadata.subject,
          newMemberId: userJid,
          newMemberNumber: userNumber,
          pushname,
          sendVideoFromFile: async (filePath, caption, mentions) => {
            const buffer = fs.readFileSync(filePath);
            await socket.sendMessage(remoteJid, {
              video: buffer,
              caption,
              mentions
            });
          },
          sendTextWithMention: async ({ caption, mentions }) =>
            await socket.sendMessage(remoteJid, { text: caption, mentions }),
        });
      } catch (err) {
        console.error('[WELCOME6] Erro:', err.message);
      }

      // WELCOME7
      try {
        await handleWelcome7NewMember({
          groupId: remoteJid,
          groupName: groupMetadata.subject,
          newMemberId: userJid,
          newMemberNumber: userNumber,
          pushname,
          sendGifFromFile: async (filePath, caption, mentions) => {
            await socket.sendMessage(remoteJid, {
              video: fs.readFileSync(filePath),
              caption,
              mentions,
              gifPlayback: true,
              mimetype: 'video/mp4'
            });
          },
          sendAudioFromFile: async (filePath) => {
            await socket.sendMessage(remoteJid, {
              audio: fs.readFileSync(filePath),
              mimetype: 'audio/mp4',
              ptt: false
            });
          },
          sendTextWithMention: async ({ caption, mentions }) =>
            await socket.sendMessage(remoteJid, { text: caption, mentions }),
        });
      } catch (err) {
        console.error('[WELCOME7] Erro:', err.message);
      }
    }
  } catch (err) {
    console.error('[GROUP PARTICIPANTS] Erro geral:', err);
  }
};