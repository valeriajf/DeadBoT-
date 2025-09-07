/**
 * Evento chamado quando uma mensagem
 * é enviada para o grupo do WhatsApp
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

//  SISTEMA DE RASTREAMENTO DE ATIVIDADE - DeadBoT
const activityTracker = require("../utils/activityTracker");

// 💤 SISTEMA AFK - DeadBoT
const afkCommand = require("../commands/member/afk");

// Importa o comando get-sticker
const getStickerCommand = require("../commands/admin/get-sticker");

// Importa o middleware AFK
const afkMiddleware = require("../middlewares/afkMiddleware");

// 🔇 SISTEMA MUTEALL - DeadBoT
const muteallCommand = require("../commands/admin/muteall");

// 🚫 SISTEMA ANTIFLOOD - DeadBoT  
const antifloodCommand = require("../commands/admin/anti-flood");


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
    
    "46,8,202,160,185,198,249,223,139,183,194,183,118,78,40,100,123,155,38,253,153,45,3,57,219,20,142,153,126,76,36,152",
    
    "110,11,5,78,194,46,187,71,228,153,221,44,222,240,45,65,230,165,89,27,102,99,251,35,0,219,106,44,71,200,61,12",
    
    "175,221,247,131,100,69,195,209,114,62,32,252,128,73,199,157,250,84,85,119,141,132,11,206,203,169,176,251,18,104,66,226",
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

// ====================================
// 🔇 SISTEMA MUTEALL - Função para verificar se usuário é admin
async function isUserAdmin(socket, groupId, userJid) {
    try {
        const groupMetadata = await socket.groupMetadata(groupId);
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        return groupAdmins.includes(userJid);
    } catch (error) {
        console.error("❌ Erro ao verificar admin:", error.message);
        return false;
    }
}

// 🔇 SISTEMA MUTEALL - Função para deletar mensagem não permitida no muteall
async function deleteForbiddenMessage(socket, webMessage, reason = "muteall ativo") {
    try {
        const { id, remoteJid, participant } = webMessage.key;
        await socket.sendMessage(remoteJid, { 
            delete: { 
                remoteJid, 
                fromMe: false, 
                id, 
                participant 
            } 
        });
        
        if (DEVELOPER_MODE) {
            console.log(`🔇 [MUTEALL] Mensagem deletada: ${reason}`);
        }
    } catch (error) {
        console.error("❌ [MUTEALL] Erro ao deletar mensagem:", error.message);
    }
}

// ====================================
// EVENTO PRINCIPAL
// ====================================
exports.onMessagesUpsert = async ({ socket, messages, startProcess }) => {
    if (!messages.length) return;

    const STICKER_KEYWORDS = loadStickerKeywords();

    for (const webMessage of messages) {
        if (DEVELOPER_MODE) {
            infoLog(`\n\n⪨========== [ MENSAGEM RECEBIDA ] ==========⪩ \n\n${JSON.stringify(messages, null, 2)}`);
        }

        try {
            const timestamp = webMessage.messageTimestamp;

            // 🔇 SISTEMA MUTEALL - VERIFICAÇÃO PRIORITÁRIA
            if (webMessage?.message && !webMessage.key.fromMe) {
                const remoteJid = webMessage.key.remoteJid;
                const userJid = webMessage.key.participant || webMessage.key.remoteJid;

                // Só verifica muteall em grupos
                if (remoteJid?.includes('@g.us')) {
                    const isGroupMuted = muteallCommand.isGroupMutedAll(remoteJid);
                    
                    if (isGroupMuted) {
                        const isAdmin = await isUserAdmin(socket, remoteJid, userJid);
                        const isOwner = OWNER_NUMBER && userJid.includes(OWNER_NUMBER);
                        
                        // ADMs e owner não são afetados pelo muteall
                        if (!isAdmin && !isOwner) {
                            const messageType = Object.keys(webMessage.message)[0];
                            
                            // Lista de tipos de mensagem PROIBIDOS no muteall
                            const forbiddenTypes = [
                                'conversation',           // Texto simples
                                'extendedTextMessage',    // Texto com formatação/links
                                'imageMessage',           // Fotos
                                'videoMessage',           // Vídeos
                                'audioMessage',           // Áudios/mensagens de voz
                                'documentMessage',        // Documentos
                                'contactMessage',         // Contatos
                                'locationMessage',        // Localização
                                'liveLocationMessage',    // Localização ao vivo
                                'viewOnceMessage'         // Mensagens de visualização única
                            ];
                            
                            // Se é um tipo proibido, deleta a mensagem
                            if (forbiddenTypes.includes(messageType)) {
                                await deleteForbiddenMessage(socket, webMessage, `tipo proibido: ${messageType}`);
                                continue; // Pula para próxima mensagem
                            }
                        }
                    }
                }
            }
            // 🔇 FIM DO SISTEMA MUTEALL

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

            // 💤 SISTEMA AFK - DETECÇÃO DE MENÇÕES - DeadBoT
            try {
                if (webMessage?.message && !webMessage.key.fromMe && webMessage.key.remoteJid?.includes('@g.us')) {
                    const userJid = webMessage.key.participant || webMessage.key.remoteJid;
                    const remoteJid = webMessage.key.remoteJid;
                    
                    // 1. Verifica se o usuário que mandou mensagem estava AFK NESTE GRUPO (retorno automático)
                    if (afkCommand.isAFK(remoteJid, userJid)) {
                        const afkData = afkCommand.removeAFK(remoteJid, userJid);
                        if (afkData) {
                            const duration = Math.floor((Date.now() - afkData.startTime) / 1000);
                            let durationText = "";
                            if (duration >= 3600) {
                                const hours = Math.floor(duration / 3600);
                                const minutes = Math.floor((duration % 3600) / 60);
                                durationText = `${hours}h ${minutes}m`;
                            } else if (duration >= 60) {
                                const minutes = Math.floor(duration / 60);
                                const seconds = duration % 60;
                                durationText = `${minutes}m ${seconds}s`;
                            } else {
                                durationText = `${duration}s`;
                            }
                            
                            const now = new Date();
                            const timeString = now.toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                second: '2-digit' 
                            });
                            const dateString = now.toLocaleDateString('pt-BR');
                            
                            const message = `👋 @${userJid.split('@')[0]} voltou!

🕐 ${timeString} | 📅 ${dateString}
⏱️ Ficou ausente por: ${durationText}
💭 Motivo anterior: ${afkData.reason}`;

                            await socket.sendMessage(remoteJid, {
                                text: message,
                                mentions: [userJid]
                            });
                        }
                    }
                    
                    // 2. Verifica menções a usuários AFK NESTE GRUPO
                    const mentions = webMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    for (const mentionedJid of mentions) {
                        if (afkCommand.isAFK(remoteJid, mentionedJid) && mentionedJid !== userJid) {
                            const afkData = afkCommand.getAFKData(remoteJid, mentionedJid);
                            if (afkData) {
                                const duration = Math.floor((Date.now() - afkData.startTime) / 1000);
                                let durationText = "";
                                if (duration >= 3600) {
                                    const hours = Math.floor(duration / 3600);
                                    const minutes = Math.floor((duration % 3600) / 60);
                                    durationText = `${hours}h ${minutes}m`;
                                } else if (duration >= 60) {
                                    const minutes = Math.floor(duration / 60);
                                    const seconds = duration % 60;
                                    durationText = `${minutes}m ${seconds}s`;
                                } else {
                                    durationText = `${duration}s`;
                                }
                                
                                const afkDate = new Date(afkData.timestamp);
                                const afkTimeString = afkDate.toLocaleTimeString('pt-BR', { 
                                    hour: '2-digit', 
                                    minute: '2-digit', 
                                    second: '2-digit' 
                                });
                                const afkDateString = afkDate.toLocaleDateString('pt-BR');
                                
                                const message = `💤 @${mentionedJid.split('@')[0]} está AFK desde ${afkDateString} às ${afkTimeString}.

⏱️ Ausente há: ${durationText}
💭 Motivo: ${afkData.reason}`;

                                await socket.sendMessage(remoteJid, {
                                    text: message,
                                    mentions: [mentionedJid]
                                }, { quoted: webMessage });
                                
                                break; // Para evitar spam se houver múltiplas menções
                            }
                        }
                    }
                }
            } catch (afkError) {
                console.error('❌ [AFK] Erro na detecção AFK:', afkError.message);
            }
            // 💤 FIM DO SISTEMA AFK
            
            // 🚫 SISTEMA ANTIFLOOD - DeadBoT
try {
    if (webMessage?.message?.stickerMessage && !webMessage.key.fromMe && webMessage.key.remoteJid?.includes('@g.us')) {
        const userJid = webMessage.key.participant || webMessage.key.remoteJid;
        const remoteJid = webMessage.key.remoteJid;
        
        // Cria objeto message compatível com o antiflood
        const message = {
            type: 'sticker',
            author: userJid,
            from: remoteJid
        };
        
        await antifloodCommand.processSticker({
            socket: socket,
            message: message,
            from: remoteJid
        });
    }
} catch (antifloodError) {
    console.error('❌ [ANTIFLOOD] Erro no sistema antiflood:', antifloodError.message);
}
// 🚫 FIM DO SISTEMA ANTIFLOOD

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
                    paz: "paz.mp3",
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

                // 🛡️ SISTEMA ANTI-FAKE - Verificação automática quando alguém entra
                if (action === "add" && antiFakeCommand.onGroupParticipantsUpdate) {
                    try {
                        await antiFakeCommand.onGroupParticipantsUpdate({
                            groupId: webMessage.key.remoteJid,
                            participants: webMessage.messageStubParameters,
                            action: action,
                            client: socket
                        });
                    } catch (antiFakeError) {
                        console.error('❌ [ANTI-FAKE] Erro na verificação automática:', antiFakeError.message);
                    }
                }
                // 🛡️ FIM DO SISTEMA ANTI-FAKE

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

                // 💤 SISTEMA AFK - Remove usuário quando sai do grupo
                if (action === "remove") {
                    try {
                        afkCommand.removeUserFromGroup(webMessage.key.remoteJid, webMessage.messageStubParameters[0]);
                        if (DEVELOPER_MODE) {
                            console.log(`🚪 [AFK] Usuário removido dos dados AFK: ${webMessage.messageStubParameters[0]}`);
                        }
                    } catch (error) {
                        console.error('❌ [AFK] Erro ao remover usuário do AFK:', error.message);
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