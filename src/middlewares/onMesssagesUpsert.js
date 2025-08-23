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

// Importa o comando get-sticker da pasta admin
const getStickerCommand = require("../commands/admin/get-sticker");

// ID único da figurinha BAN (substitua pelo ID que você pegou com #get-sticker)
const BAN_STICKER_ID = "132,199,221,11,6,89,79,133,31,176,112,107,196,23,111,114,19,103,192,49,212,127,143,164,205,144,208,41,6,174,217,148";

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

        // === BANIR USANDO FIGURINHA ESPECÍFICA
        if (webMessage.message?.stickerMessage) {
          try {
            const stickerID =
              webMessage.message.stickerMessage.fileSha256.toString("base64");

            if (stickerID === BAN_STICKER_ID && chatId.endsWith("@g.us")) {
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

              // Verifica se quem enviou é admin do grupo
              const groupMetadata = await socket.groupMetadata(chatId);
              const groupAdmins = groupMetadata.participants
                .filter((p) => p.admin)
                .map((p) => p.id);

              if (!groupAdmins.includes(sender)) {
                await socket.sendMessage(
                  chatId,
                  {
                    text: "❌ Apenas administradores podem usar esta figurinha para banir.",
                  },
                  { quoted: webMessage }
                );
                return;
              }

              // Remove usuário do grupo
              await socket.groupParticipantsUpdate(chatId, [targetJid], "remove");
              await socket.sendMessage(chatId, {
                text: "🚫 Usuário removido com sucesso pela figurinha.",
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

        // === LÓGICA DE BAN POR EMOJI ☠️
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
              text: "☠️ Usuário removido com sucesso.",
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