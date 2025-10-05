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
const { updateCacheGroupMetadata } = require("../connection");

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

//  SISTEMA MUTEALL - DeadBoT
const muteallCommand = require("../commands/admin/muteall");

//  SISTEMA ANTIFLOOD - DeadBoT  
const antifloodCommand = require("../commands/admin/anti-flood");

//  SISTEMA ANTI-FAKE - DeadBoT
const antiFakeCommand = require("../commands/admin/anti-fake");

// Importa o comando auto-sticker
const autoStickerCommand = require("../commands/admin/auto-sticker");


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
                                'conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage',
                                'audioMessage', 'documentMessage', 'contactMessage', 'locationMessage',
                                'liveLocationMessage', 'viewOnceMessage'
                            ];
                            
                            if (forbiddenTypes.includes(messageType)) {
                                await deleteForbiddenMessage(socket, webMessage, `tipo proibido: ${messageType}`);
                                continue;
                            }
                        }
                    }
                }
            }
            // 🔇 FIM DO SISTEMA MUTEALL


// ====================================
// SISTEMA DE COMANDOS POR FIGURINHA
// Adicione este código no onMessagesUpsert.js, logo após o sistema MUTEALL
// ====================================

// Importa comandos de figurinha
const abrirFigCommand = require("../commands/admin/abrir-fig");
const fecharFigCommand = require("../commands/admin/fechar-fig");

// Função para verificar se usuário é admin (pode reutilizar a que já existe)
async function isUserAdminFig(socket, groupId, userJid) {
    try {
        const groupMetadata = await socket.groupMetadata(groupId);
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        return groupAdmins.includes(userJid);
    } catch (error) {
        console.error("❌ [FIG-COMMANDS] Erro ao verificar admin:", error.message);
        return false;
    }
}

// ====================================
// ADICIONE ESTE BLOCO LOGO APÓS O SISTEMA MUTEALL NO onMessagesUpsert
// ====================================

// 🖼️ SISTEMA DE COMANDOS POR FIGURINHA - VERIFICAÇÃO PRIORITÁRIA
if (webMessage?.message?.stickerMessage && !webMessage.key.fromMe) {
    const remoteJid = webMessage.key.remoteJid;
    const userJid = webMessage.key.participant || webMessage.key.remoteJid;

    // Só verifica em grupos
    if (remoteJid?.includes('@g.us')) {
        try {
            console.log("🖼️ [FIG-COMMANDS] Processando figurinha de:", userJid);
            
            const isAdmin = await isUserAdminFig(socket, remoteJid, userJid);
            const isOwner = OWNER_NUMBER && userJid.includes(OWNER_NUMBER);
            
            // Só admins e owner podem usar comandos de figurinha
            if (isAdmin || isOwner) {
                console.log("🖼️ [FIG-COMMANDS] Usuário autorizado, verificando comandos...");
                
                // Cria objeto compatível com a estrutura de comandos
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

                // Tenta executar comando de fechar grupo
                try {
                    await fecharFigCommand.handle(commonFunctions);
                } catch (error) {
                    console.error("🖼️ [FIG-COMMANDS] Erro no comando fechar-fig:", error.message);
                }

                // Tenta executar comando de abrir grupo
                try {
                    await abrirFigCommand.handle(commonFunctions);
                } catch (error) {
                    console.error("🖼️ [FIG-COMMANDS] Erro no comando abrir-fig:", error.message);
                }
            } else {
                console.log("🖼️ [FIG-COMMANDS] Usuário não autorizado:", userJid);
            }
        } catch (error) {
            console.error("🖼️ [FIG-COMMANDS] Erro geral:", error.message);
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
                        
                        // Importa as funções necessárias diretamente
                        const { download } = require("../utils");
                        const { getRandomName } = require("../utils");
                        
                        // Cria funções customizadas
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
            

            // 💤 SISTEMA AFK - VERSÃO CORRIGIDA
try {
    if (webMessage?.message && !webMessage.key.fromMe && webMessage.key.remoteJid?.includes('@g.us')) {
        const userJid = webMessage.key.participant || webMessage.key.remoteJid;
        const remoteJid = webMessage.key.remoteJid;
        
        if (afkCommand.isAFK(remoteJid, userJid)) {
            const afkData = afkCommand.removeAFK(remoteJid, userJid);
            if (afkData) {
                // USAR A FUNÇÃO formatDuration EM VEZ DE CALCULAR DIRETAMENTE
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
    
    // Verifica se é uma resposta SIM/NÃO para confirmação de banimento
    if (textUpper === 'SIM' || textUpper === 'NÃO' || textUpper === 'NAO') {
        try {
            // Importa o sistema de confirmações pendentes do banghost
            const banghostCommand = require('../commands/admin/banghost');
            
            // Procura confirmação pendente para este grupo e usuário
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
                    
                    // Executa o banimento
                    await socket.sendMessage(chatId, {
                        text: `🔨 Iniciando banimento de ${data.ghostMembers.length} membro(s) fantasma(s)...\n⏳ Por favor, aguarde...`
                    });
                    
                    let successCount = 0;
                    let failCount = 0;
                    
                    // Bane os membros em lotes pequenos
                    const batchSize = 3;
                    for (let i = 0; i < data.ghostMembers.length; i += batchSize) {
                        const batch = data.ghostMembers.slice(i, i + batchSize);
                        
                        for (const member of batch) {
                            try {
                                await socket.groupParticipantsUpdate(chatId, [member.jid], 'remove');
                                successCount++;
                                console.log(`🚪 [BANGHOST] ${member.name} foi banido do grupo`);
                                
                                // Remove do sistema de rastreamento
                                const activityTracker = require('../utils/activityTracker');
                                if (activityTracker && typeof activityTracker.removeUser === 'function') {
                                    activityTracker.removeUser(chatId, member.jid);
                                }
                            } catch (error) {
                                failCount++;
                                console.error(`❌ [BANGHOST] Falha ao banir ${member.name}:`, error.message);
                            }
                            
                            // Aguarda entre banimentos
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                        
                        // Pausa entre lotes
                        if (i + batchSize < data.ghostMembers.length) {
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }
                    }
                    
                    // Envia relatório final
                    const reportText = `📊 *BANIMENTO CONCLUÍDO*\n\n` +
                                     `✅ Banidos com sucesso: ${successCount}\n` +
                                     `📋 Critério usado: ${data.minMessages} mensagem(s) ou menos\n` +
                                     `⏰ Concluído em: ${new Date().toLocaleString('pt-BR')}`;
                    
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
            if (now - data.timestamp > 60000) { // 1 minuto
                pendingBans.delete(id);
                expiredCount++;
                
                // Envia mensagem de timeout
                if (data.chatId) {
                    socket.sendMessage(data.chatId, {
                        text: '⏰ Tempo esgotado! Banimento cancelado automaticamente.'
                    }).catch(() => {}); // Ignora erros de envio
                }
            }
        }
        
                 if (expiredCount > 0) {
            console.log(`🔄 [BANGHOST] ${expiredCount} confirmações expiradas removidas`);
        }
        
    } catch (error) {
        console.error('❌ [BANGHOST] Erro na limpeza de confirmações:', error.message);
    }
}, 30000); // Verifica a cada 30 segundos

            if (webMessage?.message) {
                messageHandler(socket, webMessage);

                const msgText = webMessage.message?.extendedTextMessage?.text ||
                                webMessage.message?.conversation || "";
                const chatId = webMessage.key.remoteJid;
                

                // === COMANDOS #
                if (msgText.startsWith("#")) {
                    const [cmd, ...args] = msgText.trim().slice(1).split(/\s+/);
                    const command = cmd.toLowerCase();

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
                    removido: "banido.ogg",
                    confusão: "confusão.ogg"
                    
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
                if (action === "add" && antiFakeCommand.onGroupParticipantsUpdate) {
                    try {
                        await antiFakeCommand.onGroupParticipantsUpdate({
                            groupId: webMessage.key.remoteJid,
                            participants: webMessage.messageStubParameters,
                            action: action,
                            client: socket
                        });
                    } catch (antiFakeError) {
                        console.error('❌ [ANTI-FAKE] Erro:', antiFakeError.message);
                    }
                }
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