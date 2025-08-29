/**
 * Evento chamado quando uma mensagem
 * é enviada para o grupo do WhatsApp
 *
 * @author VaL
 */
const {
  isAtLeastMinutesInPast,
  GROUP_PARTICIPANT_ADD,
  GROUP_PARTICIPANT_LEAVE,
  isAddOrLeave,
} = require("../utils");
const { DEVELOPER_MODE, OWNER_NUMBER } = require("../config");
const { dynamicCommand } = require("../utils/dynamicCommand");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { onGroupParticipantsUpdate } = require("./onGroupParticipantsUpdate");
const { errorLog, infoLog } = require("../utils/logger");
const { badMacHandler } = require("../utils/badMacHandler");
const { checkIfMemberIsMuted } = require("../utils/database");
const { messageHandler } = require("./messageHandler");

const fs = require("fs");
const path = require("path");

// Importa o comando get-sticker
const getStickerCommand = require("../commands/admin/get-sticker");

// Importa o middleware AFK
const afkMiddleware = require("../middlewares/afkMiddleware");

// ============================================
// FIGURINHAS ESPECÍFICAS QUE BANIEM MEMBROS
// (IDs SHA256 em formato numérico, use seu get-sticker para coletar)
// ============================================
const BAN_STICKERS = [
  "193,200,114,58,66,198,84,225,29,94,220,2,100,203,140,167,219,186,184,113,159,130,196,63,89,134,216,155,74,221,23,74",
  
  "86,174,97,101,17,133,218,232,57,125,26,172,138,25,10,85,147,154,233,188,165,183,206,109,103,54,144,142,10,151,24,149",
  
  "13,16,8,252,168,70,214,254,182,56,147,194,12,18,72,229,221,95,59,142,55,122,62,141,29,150,148,7,84,228,215,178",
];

// ============================================
// Carrega keywords de figurinhas (palavra -> URL .webp)
// Arquivo: src/database/keywords.json
// ============================================
function loadStickerKeywords() {
  const keywordsPath = path.join(__dirname, "..", "database", "keywords.json");
  try {
    if (!fs.existsSync(keywordsPath)) {
      console.warn(`⚠️ [keywords] Arquivo não encontrado: ${keywordsPath}`);
      return {};
    }
    const raw = fs.readFileSync(keywordsPath, "utf8");
    const data = JSON.parse(raw);
    if (data && typeof data === "object") return data;
  } catch (e) {
    console.error("❌ [keywords] Erro ao carregar keywords.json:", e.message);
  }
  return {};
}

// Normaliza texto
const normalize = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// ============================================
// EVENTO PRINCIPAL
// ============================================
exports.onMessagesUpsert = async ({ socket, messages, startProcess }) => {
  if (!messages.length) return;

  // Carrega o mapa de keywords
  const STICKER_KEYWORDS = loadStickerKeywords();

  for (const webMessage of messages) {
    if (DEVELOPER_MODE) {
      infoLog(
        `\n\n⪨========== [ MENSAGEM RECEBIDA ] ==========⪩ \n\n${JSON.stringify(
          messages,
          null,
          2
        )}`
      );
    }

    try {
      const timestamp = webMessage.messageTimestamp;

      if (webMessage?.message) {
        // Processa mensagens normais e comandos
        messageHandler(socket, webMessage);

        const msgText =
          webMessage.message?.extendedTextMessage?.text ||
          webMessage.message?.conversation ||
          "";
        const chatId = webMessage.key.remoteJid;

        // === TRATAMENTO DE COMANDOS INICIADOS POR #
        if (msgText.startsWith("#")) {
          const [cmd, ...args] = msgText.trim().slice(1).split(/\s+/);
          const command = cmd.toLowerCase();

          // Comando get-sticker (admin)
          if (getStickerCommand.commands.includes(command)) {
            await getStickerCommand.handle(webMessage, { socket, args });
            continue;
          }
        }

        // === BANIR USANDO FIGURINHA ESPECÍFICA (APENAS ADM)
        if (webMessage.message?.stickerMessage) {
          try {
            const stickerID = webMessage.message.stickerMessage.fileSha256.join(",");
            if (BAN_STICKERS.includes(stickerID) && chatId.endsWith("@g.us")) {
              const targetJid =
                webMessage.message.stickerMessage.contextInfo?.participant;
              const sender = webMessage.key.participant || webMessage.key.remoteJid;
              const botJid = socket.user?.id;

              if (!targetJid) {
                await socket.sendMessage(chatId, {
                  text: "❌ Use a figurinha em resposta à mensagem da pessoa que deseja banir.",
                });
                return;
              }

              if (
                targetJid === sender ||
                targetJid === botJid ||
                (OWNER_NUMBER && targetJid.includes(OWNER_NUMBER))
              ) {
                await socket.sendMessage(
                  chatId,
                  { text: "❌ Você não pode usar esta figurinha contra essa pessoa!" },
                  { quoted: webMessage }
                );
                return;
              }

              // Verifica admins do grupo
              const groupMetadata = await socket.groupMetadata(chatId);
              const groupAdmins = groupMetadata.participants
                .filter((p) => p.admin)
                .map((p) => p.id);

              if (!groupAdmins.includes(sender)) {
                await socket.sendMessage(
                  chatId,
                  { text: "❌ Apenas administradores podem usar esta figurinha para banir." },
                  { quoted: webMessage }
                );
                return;
              }

              try {
                await socket.groupParticipantsUpdate(chatId, [targetJid], "remove");
                await socket.sendMessage(chatId, {
                  text: "🚫 Usuário removido com sucesso pela figurinha (ação de administrador).",
                });
              } catch (banErr) {
                console.error("❌ Erro ao tentar banir via figurinha:", banErr);
                await socket.sendMessage(chatId, {
                  text: "⚠️ Não consegui remover o usuário. Tenho certeza que sou administrador?",
                });
              }
            }
          } catch (err) {
            console.error("Erro no sistema de ban por figurinha:", err);
          }
        }

        // === FIGURINHAS AUTOMÁTICAS POR PALAVRA-CHAVE
        try {
          const body =
            webMessage.message?.extendedTextMessage?.text ||
            webMessage.message?.conversation ||
            "";
          const nMsg = normalize(body);

          if (nMsg) {
            for (const [key, url] of Object.entries(STICKER_KEYWORDS)) {
              const nKey = normalize(key);
              if (!nKey) continue;
              if (nMsg.includes(nKey)) {
                await socket.sendMessage(
                  chatId,
                  { sticker: { url: String(url) } },
                  { quoted: webMessage }
                );
                console.log(`[keywords] match="${key}" -> figurinha enviada`);
                break;
              }
            }
          }
        } catch (err) {
          console.error("[keywords] erro ao responder figurinha:", err);
        }

        // === ÁUDIOS AUTOMÁTICOS POR PALAVRA-CHAVE
        const audioTriggers = {
          vagabunda: "vagabunda.mp3",
          prostituta: "prostituta.mp3",
          oremos: "ferrolhos.mp3",
          sexo: "love.mp3",
          dracarys: "dracarys.mp3",
        };

        const msgLower = msgText.toLowerCase();
        for (const trigger in audioTriggers) {
          if (msgLower.includes(trigger)) {
            const audioPath = path.join(
              __dirname,
              "..",
              "assets",
              "audios",
              audioTriggers[trigger]
            );

            if (fs.existsSync(audioPath)) {
              const audioBuffer = fs.readFileSync(audioPath);
              await socket.sendMessage(chatId, {
                audio: audioBuffer,
                mimetype: "audio/mp4",
                ptt: true,
              });
            } else {
              console.warn(`Arquivo de áudio não encontrado: ${audioPath}`);
            }
            break;
          }
        }

        // === BAN POR EMOJI ☠️ (APENAS ADM)
        const emojiText =
          webMessage.message?.extendedTextMessage?.text?.trim() ||
          webMessage.message?.conversation?.trim() ||
          "";
        const contextInfo =
          webMessage.message?.extendedTextMessage?.contextInfo;

        if (
          emojiText === "☠️" &&
          contextInfo?.participant &&
          chatId.endsWith("@g.us")
        ) {
          const sender = webMessage.key.participant || chatId;
          const targetJid = contextInfo.participant;
          const botJid = socket.user?.id;

          const groupMetadata = await socket.groupMetadata(chatId);
          const groupAdmins = groupMetadata.participants
            .filter((p) => p.admin)
            .map((p) => p.id);

          if (!groupAdmins.includes(sender)) {
            await socket.sendMessage(
              chatId,
              { text: "❌ Apenas administradores podem usar o emoji ☠️ para banir." },
              { quoted: webMessage }
            );
            return;
          }

          const isSelf = targetJid === sender;
          const isBot = targetJid === botJid;
          const isOwner = targetJid.includes(OWNER_NUMBER);

          if (isSelf || isBot || isOwner) {
            await socket.sendMessage(
              chatId,
              { text: "❌ Você não pode usar ☠️ contra essa pessoa!" },
              { quoted: webMessage }
            );
          } else {
            await socket.groupParticipantsUpdate(chatId, [targetJid], "remove");
            await socket.sendMessage(chatId, {
              text: "☠️ Usuário removido com sucesso (ação de administrador).",
            });
          }
        }

        // === Middleware AFK
        await afkMiddleware(socket, { messages: [webMessage] });
      }

      if (isAtLeastMinutesInPast(timestamp)) continue;

      if (isAddOrLeave.includes(webMessage.messageStubType)) {
        let action = "";
        if (webMessage.messageStubType === GROUP_PARTICIPANT_ADD) {
          action = "add";
        } else if (webMessage.messageStubType === GROUP_PARTICIPANT_LEAVE) {
          action = "remove";
        }

        await onGroupParticipantsUpdate({
          userJid: webMessage.messageStubParameters[0],
          remoteJid: webMessage.key.remoteJid,
          socket,
          action,
        });
      } else {
        const commonFunctions = loadCommonFunctions({ socket, webMessage });
        if (!commonFunctions) continue;

        if (
          checkIfMemberIsMuted(
            commonFunctions.remoteJid,
            commonFunctions.userJid
          )
        ) {
          try {
            await commonFunctions.deleteMessage(webMessage.key);
          } catch (error) {
            errorLog(
              `Erro ao deletar mensagem de membro silenciado, provavelmente eu não sou administrador do grupo! ${error.message}`
            );
          }
          return;
        }

        await dynamicCommand(commonFunctions, startProcess);
      }
    } catch (error) {
      if (badMacHandler.handleError(error, "message-processing")) continue;
      if (badMacHandler.isSessionError(error)) {
        errorLog(`Erro de sessão ao processar mensagem: ${error.message}`);
        continue;
      }
      errorLog(
        `Erro ao processar mensagem: ${error.message} | Stack: ${error.stack}`
      );
      continue;
    }
  }
};