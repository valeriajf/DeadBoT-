/**
 * Evento chamado quando uma mensagem
 * é enviada para o grupo do WhatsApp
 *
 * Adaptado para o DeadBoT com sistema de rastreamento de atividade
 *
 * @author VaL (DeadBoT)
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

// 🔥 SISTEMA DE RASTREAMENTO DE ATIVIDADE - DeadBoT
const activityTracker = require("../utils/activityTracker");

// Importa o comando get-sticker
const getStickerCommand = require("../commands/admin/get-sticker");

// Importa o middleware AFK
const afkMiddleware = require("../middlewares/afkMiddleware");

// ====================================
// FIGURINHAS ESPECÍFICAS QUE BANEM MEMBROS
// (IDs numéricos separados por vírgula, use #get-sticker para coletar)
// ====================================
const BAN_STICKERS = [
    "227,246,6,190,64,161,232,127,190,56,219,179,82,226,18,176,33,138,111,158,181,245,171,4,59,177,106,32,179,67,148,76",
    
    "236,74,208,233,187,186,170,99,222,30,206,40,112,231,104,17,104,201,177,98,34,45,254,250,100,180,18,213,222,40,201,240",
    
    "116,205,49,43,153,13,227,246,107,133,220,157,207,192,120,170,141,0,141,51,130,161,11,79,89,80,0,48,2,152,154,60",
    
    "71,103,13,113,44,52,238,155,33,217,247,77,33,69,195,165,199,236,100,214,241,171,229,240,133,39,14,178,76,177,65,111",
    
    "232,226,227,200,225,90,105,101,220,212,8,169,67,200,184,85,212,21,70,228,24,145,25,154,99,113,42,200,53,27,18,163",
    
    "133,59,105,45,67,200,86,59,49,24,82,189,108,157,140,16,70,16,80,203,240,38,198,90,191,90,84,23,178,230,249,214",
];

// ====================================
// Carrega keywords de figurinhas (palavra -> URL .webp)
function loadStickerKeywords() {
    const keywordsPath = path.join(__dirname, "..", "database", "keywords.json");
    try {
        if (!fs.existsSync(keywordsPath)) return {};
        const raw = fs.readFileSync(keywordsPath, "utf8");
        const data = JSON.parse(raw);
        if (data && typeof data === "object") return data;
    } catch (e) {
        console.error("❌ [keywords] Erro ao carregar keywords.json:", e.message);
    }
    return {};
}

const normalize = (s) =>
    (s || "").toString().toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

// ============================================
// EVENTO PRINCIPAL
// ============================================
exports.onMessagesUpsert = async ({ socket, messages, startProcess }) => {
    if (!messages.length) return;

    const STICKER_KEYWORDS = loadStickerKeywords();

    for (const webMessage of messages) {
        if (DEVELOPER_MODE) {
            infoLog(`\n\n⪨========== [ MENSAGEM RECEBIDA ] ==========⪩ \n\n${JSON.stringify(messages, null, 2)}`);
        }

        try {
            const timestamp = webMessage.messageTimestamp;

            // 🔥 SISTEMA DE RASTREAMENTO DE ATIVIDADE MELHORADO - DeadBoT
            if (webMessage?.message && !webMessage.key.fromMe) {
                const remoteJid = webMessage.key.remoteJid;
                const userJid = webMessage.key.participant || webMessage.key.remoteJid;

                // Só rastreia mensagens de grupos
                if (remoteJid?.includes('@g.us')) {
                    try {
                        // Captura o nome do usuário de várias fontes
                        let userName = null;
                        
                        // 1. Nome do push (mais comum)
                        if (webMessage.pushName && !webMessage.pushName.match(/^\+?\d+$/)) {
                            userName = webMessage.pushName;
                        }
                        
                        // 2. Nome do notify (contatos salvos)
                        if (!userName && webMessage.verifiedBizName) {
                            userName = webMessage.verifiedBizName;
                        }
                        
                        // 3. Nome de perfil verificado
                        if (!userName && webMessage.message?.extendedTextMessage?.contextInfo?.pushName) {
                            const contextName = webMessage.message.extendedTextMessage.contextInfo.pushName;
                            if (!contextName.match(/^\+?\d+$/)) {
                                userName = contextName;
                            }
                        }

                        const messageType = Object.keys(webMessage.message || {})[0];

                        switch (messageType) {
                            case 'conversation':
                            case 'extendedTextMessage':
                                // Mensagem de texto
                                activityTracker.trackMessage(remoteJid, userJid, userName);
                                if (DEVELOPER_MODE) {
                                    console.log(`📊 [ACTIVITY] Mensagem de ${userName || userJid.split('@')[0]} registrada`);
                                }
                                break;

                            case 'stickerMessage':
                                // Figurinha
                                activityTracker.trackSticker(remoteJid, userJid, userName);
                                if (DEVELOPER_MODE) {
                                    console.log(`🎭 [ACTIVITY] Figurinha de ${userName || userJid.split('@')[0]} registrada`);
                                }
                                break;

                            case 'imageMessage':
                            case 'videoMessage':
                            case 'audioMessage':
                            case 'documentMessage':
                                // Outras mídias contam como mensagem
                                activityTracker.trackMessage(remoteJid, userJid, userName);
                                if (DEVELOPER_MODE) {
                                    console.log(`📁 [ACTIVITY] Mídia de ${userName || userJid.split('@')[0]} registrada`);
                                }
                                break;

                            default:
                                // Outros tipos de mensagem
                                if (messageType) {
                                    activityTracker.trackMessage(remoteJid, userJid, userName);
                                    if (DEVELOPER_MODE) {
                                        console.log(`💬 [ACTIVITY] ${messageType} de ${userName || userJid.split('@')[0]} registrado`);
                                    }
                                }
                                break;
                        }
                    } catch (activityError) {
                        console.error('❌ [ACTIVITY] Erro no rastreamento:', activityError.message);
                    }
                }
            }
            // 🔥 FIM DO SISTEMA DE RASTREAMENTO MELHORADO

            if (webMessage?.message) {
                messageHandler(socket, webMessage);

                const msgText = webMessage.message?.extendedTextMessage?.text ||
                                webMessage.message?.conversation || "";
                const chatId = webMessage.key.remoteJid;

                // === COMANDOS #
                if (msgText.startsWith("#")) {
                    const [cmd, ...args] = msgText.trim().slice(1).split(/\s+/);
                    const command = cmd.toLowerCase();

                    if (getStickerCommand.commands.includes(command)) {
                        await getStickerCommand.handle(webMessage, { socket, args });
                        continue;
                    }
                }

                // === BAN POR FIGURINHA (ADMs) ===
                if (webMessage.message?.stickerMessage) {
                    try {
                        // Converte SHA256 da figurinha em string numérica
                        const stickerID = Array.from(webMessage.message.stickerMessage.fileSha256 || []).join(",");

                        if (BAN_STICKERS.includes(stickerID) && chatId.endsWith("@g.us")) {
                            const targetJid = webMessage.message.stickerMessage.contextInfo?.participant;
                            const sender = webMessage.key.participant || webMessage.key.remoteJid;
                            const botJid = socket.user?.id;

                            if (!targetJid) {
                                await socket.sendMessage(chatId, { text: "🎯 Marque o alvo para banir" });
                                return;
                            }

                            const groupMetadata = await socket.groupMetadata(chatId);
                            const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);

                            if (!groupAdmins.includes(sender)) {
                                await socket.sendMessage(chatId, { text: "❌ Apenas administradores podem usar esta figurinha para banir." }, { quoted: webMessage });
                                return;
                            }

                            const isSelf = targetJid === sender;
                            const isBot = targetJid === botJid;
                            const isOwner = OWNER_NUMBER && targetJid.includes(OWNER_NUMBER);
                            const isTargetAdmin = groupAdmins.includes(targetJid);

                            if (isSelf || isBot || isOwner || isTargetAdmin) {
                                await socket.sendMessage(chatId, { text: "❌ Você não pode usar esta figurinha contra ADMs" }, { quoted: webMessage });
                                return;
                            }

                            try {
                                await socket.groupParticipantsUpdate(chatId, [targetJid], "remove");
                                await socket.sendMessage(chatId, { text: "🚫 Usuário removido com sucesso!" });
                            } catch (banErr) {
                                console.error("❌ Erro ao tentar banir via figurinha:", banErr);
                                await socket.sendMessage(chatId, { text: "⚠️ Não consegui remover o usuário. Tenho certeza que sou administrador?" });
                            }
                        }
                    } catch (err) {
                        console.error("Erro no sistema de ban por figurinha:", err);
                    }
                }

                // === FIGURINHAS AUTOMÁTICAS POR PALAVRA-CHAVE
                try {
                    const body = webMessage.message?.extendedTextMessage?.text || webMessage.message?.conversation || "";
                    const nMsg = normalize(body);

                    if (nMsg) {
                        for (const [key, url] of Object.entries(STICKER_KEYWORDS)) {
                            if (!normalize(key)) continue;
                            if (nMsg.includes(normalize(key))) {
                                await socket.sendMessage(chatId, { sticker: { url: String(url) } }, { quoted: webMessage });
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
                        const audioPath = path.join(__dirname, "..", "assets", "audios", audioTriggers[trigger]);
                        if (fs.existsSync(audioPath)) {
                            const audioBuffer = fs.readFileSync(audioPath);
                            await socket.sendMessage(chatId, { audio: audioBuffer, mimetype: "audio/mp4", ptt: true });
                        } else {
                            console.warn(`Arquivo de áudio não encontrado: ${audioPath}`);
                        }
                        break;
                    }
                }

                // === BAN POR EMOJI ☠️ (ADMs)
                const emojiText = webMessage.message?.extendedTextMessage?.text?.trim() || webMessage.message?.conversation?.trim() || "";
                const contextInfo = webMessage.message?.extendedTextMessage?.contextInfo;

                if (emojiText === "☠️" && contextInfo?.participant && chatId.endsWith("@g.us")) {
                    const sender = webMessage.key.participant || chatId;
                    const targetJid = contextInfo.participant;
                    const botJid = socket.user?.id;

                    const groupMetadata = await socket.groupMetadata(chatId);
                    const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);

                    if (!groupAdmins.includes(sender)) {
                        await socket.sendMessage(chatId, { text: "❌ Apenas administradores podem usar o emoji ☠️ para banir." }, { quoted: webMessage });
                        return;
                    }

                    const isSelf = targetJid === sender;
                    const isBot = targetJid === botJid;
                    const isOwner = OWNER_NUMBER && targetJid.includes(OWNER_NUMBER);
                    const isTargetAdmin = groupAdmins.includes(targetJid);

                    if (isSelf || isBot || isOwner || isTargetAdmin) {
                        await socket.sendMessage(chatId, { text: "❌ Você não pode usar ☠️ contra ADMs!" }, { quoted: webMessage });
                        return;
                    }

                    try {
                        await socket.groupParticipantsUpdate(chatId, [targetJid], "remove");
                        await socket.sendMessage(chatId, { text: "☠️ Usuário removido com sucesso" });
                    } catch (banErr) {
                        console.error("❌ Erro ao tentar banir via ☠️:", banErr);
                        await socket.sendMessage(chatId, { text: "⚠️ Não consegui remover o usuário. Tenho certeza que sou administrador?" });
                    }
                }

                // === Middleware AFK
                await afkMiddleware(socket, { messages: [webMessage] });
            }

            if (isAtLeastMinutesInPast(timestamp)) continue;

            if (isAddOrLeave.includes(webMessage.messageStubType)) {
                const action = webMessage.messageStubType === GROUP_PARTICIPANT_ADD ? "add" : "remove";

                await onGroupParticipantsUpdate({
                    userJid: webMessage.messageStubParameters[0],
                    remoteJid: webMessage.key.remoteJid,
                    socket,
                    action,
                });
                
                // 🔥 SISTEMA DE RASTREAMENTO - Remove usuário quando sai do grupo
                if (action === "remove") {
                    try {
                        activityTracker.removeUser(webMessage.key.remoteJid, webMessage.messageStubParameters[0]);
                        if (DEVELOPER_MODE) {
                            console.log(`🚪 [ACTIVITY] Usuário removido dos dados: ${webMessage.messageStubParameters[0]}`);
                        }
                    } catch (error) {
                        console.error('❌ [ACTIVITY] Erro ao remover usuário:', error.message);
                    }
                }
            } else {
                if (checkIfMemberIsMuted(webMessage?.key?.remoteJid, webMessage?.key?.participant?.replace(/:[0-9][0-9]|:[0-9]/g, ""))) {
                    try {
                        const { id, remoteJid, participant } = webMessage.key;
                        await socket.sendMessage(remoteJid, { delete: { remoteJid, fromMe: false, id, participant } });
                    } catch (error) {
                        errorLog(`Erro ao deletar mensagem de membro silenciado: ${error.message}`);
                    }
                    return;
                }

                const commonFunctions = loadCommonFunctions({ socket, webMessage });
                if (!commonFunctions) continue;
                await dynamicCommand(commonFunctions, startProcess);
            }
        } catch (error) {
            if (badMacHandler.handleError(error, "message-processing")) continue;
            if (badMacHandler.isSessionError(error)) {
                errorLog(`Erro de sessão ao processar mensagem: ${error.message}`);
                continue;
            }
            errorLog(`Erro ao processar mensagem: ${error.message} | Stack: ${error.stack}`);
            continue;
        }
    }
};