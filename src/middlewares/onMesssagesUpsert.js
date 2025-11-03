/**
 * Evento chamado quando uma mensagem
 * é enviada para o grupo do WhatsApp
 *
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
const connection = require("../connection");

const fs = require("fs");
const path = require("path");

//  SISTEMA DE RASTREAMENTO DE ATIVIDADE - DeadBoT
const activityTracker = require("../utils/activityTracker");

//  SISTEMA AFK - DeadBoT
const afkCommand = require("../commands/member/afk");

// Importa o comando get-sticker
const getStickerCommand = require("../commands/admin/get-sticker");

// Importa o middleware AFK
const afkMiddleware = require("../middlewares/afkMiddleware");

//  SISTEMA ANTIFLOOD - DeadBoT  
const antifloodCommand = require("../commands/admin/anti-flood");

// Importa o comando auto-sticker
const autoStickerCommand = require("../commands/admin/auto-sticker");

//  Importa o comando anti-pv
 const antiPvCommand = require("../commands/owner/anti-pv");



//  Comandos fig-ban
const figBanAddCommand = require("../commands/admin/fig-ban-add");
const figBanDeleteCommand = require("../commands/admin/fig-ban-delete");
const figBanListCommand = require("../commands/admin/fig-ban-list");
const figBanClearCommand = require("../commands/admin/fig-ban-clear");

// ====================================
// SISTEMA FIG-BAN - Carregar figurinhas banidas do banco
// ====================================
function loadBanStickers() {
    const dbPath = path.join(__dirname, "..", "database", "fig-ban.json");
    try {
        if (!fs.existsSync(dbPath)) return [];
        const raw = fs.readFileSync(dbPath, "utf8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.stickers)) return data.stickers;
    } catch (e) {
        console.error("❌ [FIG-BAN] Erro ao carregar fig-ban.json:", e.message);
    }
    return [];
}

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
// Função auxiliar para verificar se usuário é admin
async function isUserAdminFig(socket, groupId, userJid) {
    try {
        const groupMetadata = await socket.groupMetadata(groupId);
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        return groupAdmins.includes(userJid);
    } catch (error) {
        return false;
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
        
         // 🚫 SISTEMA ANTI-PV - Bloqueia TUDO no privado quando ativado
if (!webMessage.key.fromMe && !webMessage.key.remoteJid?.includes('@g.us')) {
    try {
        const antiPvData = antiPvCommand.loadAntiPvData();
        const isAntiPvActiveInAnyGroup = Object.values(antiPvData).some(value => value === true);
        
        if (isAntiPvActiveInAnyGroup) {
            console.log(`🚫 [ANTI-PV] Mensagem privada BLOQUEADA de: ${webMessage.key.remoteJid}`);
            
            // Envia mensagem uma única vez e bloqueia o contato
            await socket.sendMessage(webMessage.key.remoteJid, {
                text: "🚫 *Antipv ativado!*\n\n❌ Mensagens privadas serão bloqueadas.\n\n✅ Use o bot apenas nos grupos."
            });
            
            // BLOQUEIA o contato para não receber mais mensagens
            await socket.updateBlockStatus(webMessage.key.remoteJid, 'block');
            
            console.log(`🔒 [ANTI-PV] Contato ${webMessage.key.remoteJid} foi BLOQUEADO`);
            
            // Pula COMPLETAMENTE esta mensagem
            continue;
        }
    } catch (antiPvError) {
        console.error('❌ [ANTI-PV] Erro:', antiPvError.message);
    }
}
// 🚫 FIM ANTI-PV

        try {
            const timestamp = webMessage.messageTimestamp;

            // 🖼️ SISTEMA DE COMANDOS POR FIGURINHA
            const abrirFigCommand = require("../commands/admin/abrir-fig");
            const fecharFigCommand = require("../commands/admin/fechar-fig");
            
            if (webMessage?.message?.stickerMessage && !webMessage.key.fromMe) {
                const remoteJid = webMessage.key.remoteJid;
                const userJid = webMessage.key.participant || webMessage.key.remoteJid;

                if (remoteJid?.includes('@g.us')) {
                    try {
                        const isAdmin = await isUserAdminFig(socket, remoteJid, userJid);
                        const isOwner = OWNER_NUMBER && userJid.includes(OWNER_NUMBER);
                        
                        if (isAdmin || isOwner) {
                            const commonFunctions = {
                                sendReply: async (text) => {
                                    return await socket.sendMessage(remoteJid, {
                                        text: text
                                    }, { quoted: webMessage });
                                },
                                sendErrorReply: async (text) => {
                                    return await socket.sendMessage(remoteJid, {
                                        text: text
                                    }, { quoted: webMessage });
                                },
                                socket: socket,
                                webMessage: webMessage,
                                isGroupMessage: true,
                                isFromAdmins: isAdmin || isOwner,
                                groupId: remoteJid
                            };

                            try {
                                await fecharFigCommand.handle(commonFunctions);
                            } catch (error) {
                                // Silencioso
                            }

                            try {
                                await abrirFigCommand.handle(commonFunctions);
                            } catch (error) {
                                // Silencioso
                            }
                        }
                    } catch (error) {
                        // Silencioso
                    }
                }
            }
            // 🖼️ FIM DO SISTEMA DE COMANDOS POR FIGURINHA

            // 🔥 SISTEMA DE RASTREAMENTO DE ATIVIDADE
            if (webMessage?.message && !webMessage.key.fromMe) {
                const remoteJid = webMessage.key.remoteJid;
                const userJid = webMessage.key.participant || webMessage.key.remoteJid;
                if (remoteJid?.includes('@g.us')) {
                    try {
                        let userName = webMessage.pushName || null;
                        const messageType = Object.keys(webMessage.message || {})[0];
                        switch (messageType) {
                            case 'conversation':
                            case 'extendedTextMessage':
                                activityTracker.trackMessage(remoteJid, userJid, userName);
                                break;
                            case 'stickerMessage':
                                activityTracker.trackSticker(remoteJid, userJid, userName);
                                break;
                            case 'imageMessage':
                            case 'videoMessage':
                            case 'audioMessage':
                            case 'documentMessage':
                                activityTracker.trackMessage(remoteJid, userJid, userName);
                                break;
                            default:
                                if (messageType) activityTracker.trackMessage(remoteJid, userJid, userName);
                                break;
                        }
                    } catch (activityError) {
                        console.error('❌ [ACTIVITY] Erro:', activityError.message);
                    }
                }
            }
            // 🔥 FIM RASTREAMENTO
            
            // 🖼️ SISTEMA AUTO-STICKER
            try {
                const autoStickerCmd = require("../commands/admin/auto-sticker");
                
                const hasImage = !!(
                    webMessage?.message?.imageMessage ||
                    webMessage?.message?.viewOnceMessage?.message?.imageMessage
                );
                
                if (hasImage && !webMessage.key.fromMe && webMessage.key.remoteJid?.includes('@g.us')) {
                    const groupId = webMessage.key.remoteJid;
                    const isActive = autoStickerCmd.isActive(groupId);
                    
                    if (isActive) {
                        console.log('[AUTO-STICKER] Processando imagem diretamente...');
                        
                        const { download } = require("../utils");
                        const { getRandomName } = require("../utils");
                        
                        const downloadImage = async (msg, filename) => {
                            return await download(msg, filename, "image", "png");
                        };
                        
                        const sendStickerFromFile = async (filePath) => {
                            return await socket.sendMessage(groupId, {
                                sticker: fs.readFileSync(filePath)
                            }, { quoted: webMessage });
                        };
                        
                        await autoStickerCmd.processAutoSticker({
                            isImage: true,
                            isGroup: true,
                            groupId: groupId,
                            webMessage: webMessage,
                            downloadImage: downloadImage,
                            sendStickerFromFile: sendStickerFromFile,
                            userJid: webMessage.key.participant || webMessage.key.remoteJid,
                        });
                        
                        console.log('[AUTO-STICKER] ✅ Processamento concluído');
                    }
                }
            } catch (autoStickerError) {
                console.error('❌ [AUTO-STICKER] Erro:', autoStickerError.message);
                console.error('❌ [AUTO-STICKER] Stack:', autoStickerError.stack);
            }
            // 🖼️ FIM AUTO-STICKER

            // 💤 SISTEMA AFK
            try {
                if (webMessage?.message && !webMessage.key.fromMe && webMessage.key.remoteJid?.includes('@g.us')) {
                    const userJid = webMessage.key.participant || webMessage.key.remoteJid;
                    const remoteJid = webMessage.key.remoteJid;
                    
                    if (afkCommand.isAFK(remoteJid, userJid)) {
                        const afkData = afkCommand.removeAFK(remoteJid, userJid);
                        if (afkData) {
                            const timeAway = afkCommand.formatDuration(Date.now() - afkData.startTime);
                            
                            await socket.sendMessage(remoteJid, {
                                text: `👋 @${userJid.split('@')[0]} voltou!\n\n⏱️ Ficou ausente por: ${afkCommand.formatDuration(Date.now() - afkData.startTime)}\n\n💭 Motivo: ${afkData.reason}`,
                                mentions: [userJid]
                            });
                        }
                    }
                    
                    const mentions = webMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    for (const mentionedJid of mentions) {
                        if (afkCommand.isAFK(remoteJid, mentionedJid) && mentionedJid !== userJid) {
                            const afkData = afkCommand.getAFKData(remoteJid, mentionedJid);
                            if (afkData) {
                                await socket.sendMessage(remoteJid, {
                                    text: `💤 @${mentionedJid.split('@')[0]} está AFK.\n💭 Motivo: ${afkData.reason}`,
                                    mentions: [mentionedJid]
                                }, { quoted: webMessage });
                                break;
                            }
                        }
                    }
                }
            } catch (afkError) {
                console.error('❌ [AFK] Erro:', afkError.message);
            }
            // 💤 FIM AFK
            
            // 🚫 ANTIFLOOD
            try {
                if (webMessage?.message?.stickerMessage && !webMessage.key.fromMe && webMessage.key.remoteJid?.includes('@g.us')) {
                    const userJid = webMessage.key.participant || webMessage.key.remoteJid;
                    const remoteJid = webMessage.key.remoteJid;
                    const message = { type: 'sticker', author: userJid, from: remoteJid };
                    await antifloodCommand.processSticker({ socket, message, from: remoteJid });
                }
            } catch (antifloodError) {
                console.error('❌ [ANTIFLOOD] Erro:', antifloodError.message);
            }
            // 🚫 FIM ANTIFLOOD

            // 🚫 SISTEMA BANGHOST - Detecção de confirmação SIM/NÃO
            if (webMessage?.message && !webMessage.key.fromMe && webMessage.key.remoteJid?.includes('@g.us')) {
                const userJid = webMessage.key.participant || webMessage.key.remoteJid;
                const chatId = webMessage.key.remoteJid;
                const msgText = webMessage.message?.extendedTextMessage?.text || webMessage.message?.conversation || "";
                const textUpper = msgText.trim().toUpperCase();
                
                if (textUpper === 'SIM' || textUpper === 'NÃO' || textUpper === 'NAO') {
                    try {
                        const banghostCommand = require('../commands/admin/banghost');
                        const pendingBans = banghostCommand.getPendingBans ? banghostCommand.getPendingBans() : new Map();
                        
                        let targetConfirmation = null;
                        for (const [id, data] of pendingBans.entries()) {
                            if (data.chatId === chatId && data.adminJid === userJid) {
                                targetConfirmation = { id, data };
                                break;
                            }
                        }
                        
                        if (targetConfirmation) {
                            const { id: confirmationId, data } = targetConfirmation;
                            
                            if (textUpper === 'SIM') {
                                pendingBans.delete(confirmationId);
                                
                                await socket.sendMessage(chatId, {
                                    text: `🔨 Iniciando banimento de ${data.ghostMembers.length} membro(s) fantasma(s)...\n⏳ Por favor, aguarde...`
                                });
                                
                                let successCount = 0;
                                let failCount = 0;
                                
                                const batchSize = 3;
                                for (let i = 0; i < data.ghostMembers.length; i += batchSize) {
                                    const batch = data.ghostMembers.slice(i, i + batchSize);
                                    
                                    for (const member of batch) {
                                        try {
                                            await socket.groupParticipantsUpdate(chatId, [member.jid], 'remove');
                                            successCount++;
                                            console.log(`🚪 [BANGHOST] ${member.name} foi banido do grupo`);
                                            
                                            const activityTracker = require('../utils/activityTracker');
                                            if (activityTracker && typeof activityTracker.removeUser === 'function') {
                                                activityTracker.removeUser(chatId, member.jid);
                                            }
                                        } catch (error) {
                                            failCount++;
                                            console.error(`❌ [BANGHOST] Falha ao banir ${member.name}:`, error.message);
                                        }
                                        
                                        await new Promise(resolve => setTimeout(resolve, 1500));
                                    }
                                    
                                    if (i + batchSize < data.ghostMembers.length) {
                                        await new Promise(resolve => setTimeout(resolve, 3000));
                                    }
                                }
                                
                                const reportText = `📊 *BANIMENTO CONCLUÍDO*\n\n` +
                                                 `✅ Banidos com sucesso: ${successCount}\n`;                   
                                
                                await socket.sendMessage(chatId, { text: reportText });
                                
                            } else if (textUpper === 'NÃO' || textUpper === 'NAO') {
                                pendingBans.delete(confirmationId);
                                await socket.sendMessage(chatId, {
                                    text: "✅ Banimento cancelado com sucesso!"
                                });
                            }
                        }
                        
                    } catch (error) {
                        console.error('❌ [BANGHOST] Erro na confirmação:', error.message);
                    }
                }
            }

            // 🚫 SISTEMA BANGHOST - Limpeza automática de confirmações expiradas
            setInterval(() => {
                try {
                    const banghostCommand = require('../commands/admin/banghost');
                    const pendingBans = banghostCommand.getPendingBans ? banghostCommand.getPendingBans() : new Map();
                    
                    const now = Date.now();
                    let expiredCount = 0;
                    
                    for (const [id, data] of pendingBans.entries()) {
                        if (now - data.timestamp > 60000) {
                            pendingBans.delete(id);
                            expiredCount++;
                            
                            if (data.chatId) {
                                socket.sendMessage(data.chatId, {
                                    text: '⏰ Tempo esgotado! Banimento cancelado automaticamente.'
                                }).catch(() => {});
                            }
                        }
                    }
                    
                    if (expiredCount > 0) {
                        console.log(`🔄 [BANGHOST] ${expiredCount} confirmações expiradas removidas`);
                    }
                    
                } catch (error) {
                    console.error('❌ [BANGHOST] Erro na limpeza de confirmações:', error.message);
                }
            }, 30000);

            if (webMessage?.message) {
                messageHandler(socket, webMessage);

                const msgText = webMessage.message?.extendedTextMessage?.text ||
                                webMessage.message?.conversation || "";
                const chatId = webMessage.key.remoteJid;
                
                // === COMANDOS #
                if (msgText.startsWith("#")) {
                    const [cmd, ...args] = msgText.trim().slice(1).split(/\s+/);
                    const command = cmd.toLowerCase();
                    
                    // Reação ao símbolo # sozinho
                    if (msgText.trim() === "#") {
                        try {
                            await socket.sendMessage(chatId, {
                                react: {
                                    text: "🤖",
                                    key: webMessage.key
                                }
                            });
                        } catch (reactError) {
                            console.error("❌ Erro ao reagir:", reactError.message);
                        }
                        continue;
                    }

                    // get-sticker
                    if (getStickerCommand.commands.includes(command)) {
                        await getStickerCommand.handle(webMessage, { socket, args });
                        continue;
                    }
                    
                    // auto-sticker
                    const autoStickerCmd = require("../commands/admin/auto-sticker");
                    if (autoStickerCmd.commands.includes(command)) {
                        const commonFunctions = loadCommonFunctions({ socket, webMessage });
                        if (commonFunctions) {
                            await autoStickerCmd.handle({
                                ...commonFunctions,
                                args: args
                            });
                        }
                        continue;
                    }

                    // fig-ban
                    if (command === "fig-ban-add") {
                        await figBanAddCommand.handle(webMessage, { socket });
                        continue;
                    }
                    if (command === "fig-ban-delete") {
                        await figBanDeleteCommand.handle(webMessage, { socket });
                        continue;
                    }
                    if (command === "fig-ban-list") {
                        await figBanListCommand.handle(webMessage, { socket });
                        continue;
                    }
                    if (command === "fig-ban-clear") {
                        await figBanClearCommand.handle(webMessage, { socket });
                        continue;
                    }
                }

                // === BAN POR FIGURINHA (DINÂMICO) ===
                if (webMessage.message?.stickerMessage) {
                    try {
                        const stickerID = webMessage.message.stickerMessage.fileSha256.toString("base64");
                        const banStickers = loadBanStickers();
                        if (banStickers.includes(stickerID) && chatId.endsWith("@g.us")) {
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
                            if ([sender, botJid].includes(targetJid) || (OWNER_NUMBER && targetJid.includes(OWNER_NUMBER)) || groupAdmins.includes(targetJid)) {
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
                            if (nMsg.includes(normalize(key))) {
                                await socket.sendMessage(chatId, { sticker: { url: String(url) } }, { quoted: webMessage });
                                break;
                            }
                        }
                    }
                } catch (err) {
                    console.error("[keywords] erro ao responder figurinha:", err);
                }

                // === ÁUDIOS AUTOMÁTICOS POR PALAVRA-CHAVE
                const audioTriggers = {
                    vagabunda: "vagabunda.ogg",
                    prostituta: "prostituta.ogg",
                    oremos: "ferrolhos.ogg",
                    sexo: "love.ogg",
                    denise: "denise.ogg",
                    fofoca: "plantao.ogg",
                    tecnologia: "tecnologia.ogg",
                };
                const msgLower = msgText.toLowerCase();
                for (const trigger in audioTriggers) {
                    if (msgLower.includes(trigger)) {
                        const audioPath = path.join(__dirname, "..", "assets", "audios", audioTriggers[trigger]);
                        if (fs.existsSync(audioPath)) {
                            const audioBuffer = fs.readFileSync(audioPath);
                            await socket.sendMessage(chatId, { audio: audioBuffer, mimetype: "audio/mp4", ptt: true });
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
                if (action === "remove") {
                    try { activityTracker.removeUser(webMessage.key.remoteJid, webMessage.messageStubParameters[0]); } catch {}
                    try { afkCommand.removeUserFromGroup(webMessage.key.remoteJid, webMessage.messageStubParameters[0]); } catch {}
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