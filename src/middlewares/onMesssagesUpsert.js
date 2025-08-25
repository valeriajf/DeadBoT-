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

// ============================================
// LISTA DE FIGURINHAS BAN (adicione quantas IDs quiser)
// Use o comando #get-sticker para pegar o ID base64 e cole aqui
// ============================================
const BAN_STICKERS = [
  "38,220,121,12,125,166,227,139,101,133,244,234,87,43,144,46,160,181,223,141,54,61,43,16,68,26,1,202,233,104,221,164",
  
  "132,199,221,11,6,89,79,133,31,176,112,107,196,23,111,114,19,103,192,49,212,127,143,164,205,144,208,41,6,174,217,148",
  
  "177,133,229,80,25,217,165,119,127,149,170,46,194,5,136,189,203,88,234,80,10,197,211,191,178,36,226,209,69,19,213,84",
  
  "55,75,46,74,247,7,40,35,164,228,207,184,87,226,13,162,173,109,83,25,185,28,30,186,56,88,243,81,66,148,31,130",
];

// ============================================
// EVENTO PRINCIPAL
// ============================================
exports.onMessagesUpsert = async ({ socket, messages, startProcess }) => {
  if (!messages.length) return;

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
            continue; // comando executado
          }
        }

        // === BANIR USANDO FIGURINHAS DA LISTA (APENAS ADM)
        if (webMessage.message?.stickerMessage) {
          try {
            const stickerID =
              webMessage.message.stickerMessage.fileSha256.toString("base64");

            if (BAN_STICKERS.includes(stickerID) && chatId.endsWith("@g.us")) {
              const targetJid =
                webMessage.message.stickerMessage.contextInfo?.participant;
              const sender =
                webMessage.key.participant || webMessage.key.remoteJid;
              const botJid = socket.user?.id;

              if (!targetJid) {
                await socket.sendMessage(chatId, {
                  text: "❌ Responda a mensagem da pessoa que deseja banir.",
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
                  {
                    text: "❌ Você não pode usar esta figurinha contra essa pessoa!",
                  },
                  { quoted: webMessage }
                );
                return;
              }

              // Verifica se quem enviou a figurinha é admin do grupo
              const groupMetadata = await socket.groupMetadata(chatId);
              const groupAdmins = groupMetadata.participants
                .filter((p) => p.admin)
                .map((p) => p.id);

              if (!groupAdmins.includes(sender)) {
                await socket.sendMessage(
                  chatId,
                  {
                    text: "❌ Apenas administradores podem usar estas figurinhas para banir.",
                  },
                  { quoted: webMessage }
                );
                return;
              }

              // Remove usuário do grupo
              await socket.groupParticipantsUpdate(chatId, [targetJid], "remove");
              await socket.sendMessage(chatId, {
                text: "🚫 Usuário removido com sucesso pela figurinha (ação de administrador).",
              });
            }
          } catch (err) {
            console.error("Erro no sistema de ban por figurinha:", err);
          }
        }

        // === ÁUDIO AUTOMÁTICO POR PALAVRA-CHAVE
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

        // === LÓGICA DE BAN POR EMOJI ☠️ (AGORA APENAS ADM)
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

          // Busca admins do grupo
          const groupMetadata = await socket.groupMetadata(chatId);
          const groupAdmins = groupMetadata.participants
            .filter((p) => p.admin)
            .map((p) => p.id);

          // Bloqueia não-adms
          if (!groupAdmins.includes(sender)) {
            await socket.sendMessage(
              chatId,
              {
                text: "❌ Apenas administradores podem usar o emoji ☠️ para banir.",
              },
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
              {
                text: "❌ Você não pode usar ☠️ contra essa pessoa!",
              },
              { quoted: webMessage }
            );
          } else {
            await socket.groupParticipantsUpdate(chatId, [targetJid], "remove");
            await socket.sendMessage(chatId, {
              text: "☠️ Usuário removido com sucesso (ação de administrador).",
            });
          }
        }
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