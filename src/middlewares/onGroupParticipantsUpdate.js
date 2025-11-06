/**
 * Evento chamado quando um usuário entra ou sai de um grupo de WhatsApp.
 * Suporta: WELCOME1–4, EXIT padrão, EXIT2 e sistema de blacklist.
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
const { handleWelcome2NewMember } = require("../utils/welcome2Handler");
const { handleWelcome3NewMember } = require("../utils/welcome3Handler");
const { handleWelcome4NewMember } = require("../utils/welcome4Handler");

const BLACKLIST_FILE = path.join(__dirname, "..", "data", "blacklist.json");

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

    // EXIT2 — sistema de saída personalizada
    try {
      const EXIT2_PATH = path.join(__dirname, "../database/exit-messages.json");
      if (action === "remove" || action === "leave") {
        if (fs.existsSync(EXIT2_PATH)) {
          const data = JSON.parse(fs.readFileSync(EXIT2_PATH, "utf8") || "{}");
          const groupExit = data[remoteJid];
          if (groupExit && groupExit.active) {
            const userNumber = userJid.split("@")[0];
            const message = groupExit.message || "👋 Saiu do grupo!";
            await socket.sendMessage(remoteJid, {
              text: message.replace(/@user/g, `@${userNumber}`),
              mentions: [userJid],
            });
          }
        }
      }
    } catch {}

    // SISTEMAS DE ENTRADA (WELCOME e BLACKLIST)
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
    }

    // EXIT PADRÃO
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
      } catch {}
    }
  } catch {}
};