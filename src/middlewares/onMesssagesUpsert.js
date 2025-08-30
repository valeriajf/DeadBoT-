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
// FIGURINHAS ESPECÍFICAS QUE BANEM MEMBROS
// (IDs SHA256 em formato numérico, use seu get-sticker para coletar)
// ============================================
const BAN_STICKERS = [
    "116,205,49,43,153,13,227,246,107,133,220,157,207,192,120,170,141,0,141,51,130,161,11,79,89,80,0,48,2,152,154,60",
    
    "71,103,13,113,44,52,238,155,33,217,247,77,33,69,195,165,199,236,100,214,241,171,229,240,133,39,14,178,76,177,65,111",
    
    "232,1,71,43,63,206,2,221,36,8,191,144,60,95,47,237,127,23,225,92,254,205,133,198,239,79,45,238,229,32,239,201",
    
    "236,74,208,233,187,186,170,99,222,30,206,40,112,231,104,17,104,201,177,98,34,45,254,250,100,180,18,213,222,40,201,240",
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

                // === BANIR USANDO FIGURINHA ESPECÍFICA (ADMs podem usar)
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
                                    text: "🎯 Marque o alvo para banir",
                                });
                                return;
                            }

                            // Verifica admins do grupo
                            const groupMetadata = await socket.groupMetadata(chatId);
                            const groupAdmins = groupMetadata.participants
                                .filter((p) => p.admin)
                                .map((p) => p.id);

                            // Se quem enviou não for ADM, bloqueia
                            if (!groupAdmins.includes(sender)) {
                                await socket.sendMessage(
                                    chatId,
                                    { text: "❌ Apenas administradores podem usar esta figurinha para banir." },
                                    { quoted: webMessage }
                                );
                                return;
                            }

                            // Bloqueia ban em si mesmo, no bot, no dono ou em outro ADM
                            const isSelf = targetJid === sender;
                            const isBot = targetJid === botJid;
                            const isOwner = OWNER_NUMBER && targetJid.includes(OWNER_NUMBER);
                            const isTargetAdmin = groupAdmins.includes(targetJid);

                            if (isSelf || isBot || isOwner || isTargetAdmin) {
                                await socket.sendMessage(
                                    chatId,
                                    { text: "❌ Você não pode usar esta figurinha contra ADMs" },
                                    { quoted: webMessage }
                                );
                                return;
                            }

                            // Tenta banir
                            try {
                                await socket.groupParticipantsUpdate(chatId, [targetJid], "remove");
                                await socket.sendMessage(chatId, {
                                    text: "🚫 Usuário removido com sucesso!",
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

                // === BAN POR EMOJI ☠️ (ADMs podem usar)
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

                    // Se quem enviou não for ADM, bloqueia
                    if (!groupAdmins.includes(sender)) {
                        await socket.sendMessage(
                            chatId,
                            { text: "❌ Apenas administradores podem usar o emoji ☠️ para banir." },
                            { quoted: webMessage }
                        );
                        return;
                    }

                    // Bloqueios
                    const isSelf = targetJid === sender;
                    const isBot = targetJid === botJid;
                    const isOwner = OWNER_NUMBER && targetJid.includes(OWNER_NUMBER);
                    const isTargetAdmin = groupAdmins.includes(targetJid);

                    if (isSelf || isBot || isOwner || isTargetAdmin) {
                        await socket.sendMessage(
                            chatId,
                            { text: "❌ Você não pode usar ☠️ contra administradores, o dono, o bot ou você mesmo!" },
                            { quoted: webMessage }
                        );
                        return;
                    }

                    // Tenta banir
                    try {
                        await socket.groupParticipantsUpdate(chatId, [targetJid], "remove");
                        await socket.sendMessage(chatId, {
                            text: "☠️ Usuário removido com sucesso (ação de administrador).",
                        });
                    } catch (banErr) {
                        console.error("❌ Erro ao tentar banir via ☠️:", banErr);
                        await socket.sendMessage(chatId, {
                            text: "⚠️ Não consegui remover o usuário. Tenho certeza que sou administrador?",
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

                if (
                    checkIfMemberIsMuted(
                        webMessage?.key?.remoteJid,
                        webMessage?.key?.participant?.replace(/:[0-9][0-9]|:[0-9]/g, "")
                    )
                ) {
                    try {
                        const { id, remoteJid, participant } = webMessage.key;

                        const deleteKey = {
                            remoteJid,
                            fromMe: false,
                            id,
                            participant,
                        };

                        await socket.sendMessage(remoteJid, { delete: deleteKey });
                    } catch (error) {
                        errorLog(
                            `Erro ao deletar mensagem de membro silenciado, provavelmente eu não sou administrador do grupo! ${error.message}`
                        );
                    }
                    return;
                }

                const commonFunctions = loadCommonFunctions({ socket, webMessage });

                if (!commonFunctions) {
                    continue;
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