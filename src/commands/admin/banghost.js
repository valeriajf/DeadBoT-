/**
 * Comando BanGhost - Lista e bane membros fantasmas (inativos)
 * Usa a mesma estrutura e sistema do rank-inativo para identificar membros fantasmas
 * 
 * @author VaL (DeadBoT)
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const { OWNER_NUMBER } = require(`${BASE_DIR}/config`);

// Armazenamento temporário para confirmações de banimento
const pendingBans = new Map();

module.exports = {
    name: "banghost",
    description: "Lista e pode banir membros fantasmas (inativos) do grupo",
    commands: ["banghost", "banfantasma"],
    usage: `${PREFIX}banghost [número]`,
    
    // Expõe o Map para ser acessado pelo onMessagesUpsert
    getPendingBans: () => pendingBans,
    
    /**
     * @param {CommandHandleProps} props
     * @returns {Promise<void>}
     */
    handle: async ({
        sendSuccessReact,
        sendWarningReact,
        sendErrorReact,
        sendReply,
        remoteJid,
        baileysMessage,
        isGroup,
        getGroupParticipants,
        socket,
        args,
        webMessage
    }) => {
        try {
            // Verificar se é um grupo
            if (!isGroup) {
                await sendWarningReact();
                return await sendReply("⚠️ Este comando só pode ser usado em grupos!");
            }

            // Extrair dados do usuário
            const userJid = webMessage.key.participant || webMessage.key.remoteJid;
            
            // Verificar se é resposta SIM/NÃO (tratado pelo onMessagesUpsert)
            const text = webMessage.message?.conversation || webMessage.message?.extendedTextMessage?.text || "";
            const textUpper = text.trim().toUpperCase();
            
            if (textUpper === 'SIM' || textUpper === 'NÃO' || textUpper === 'NAO') {
                return; // Será tratado pelo onMessagesUpsert
            }

            // Verifica se o usuário é admin
            const participants = await getGroupParticipants();
            const userParticipant = participants.find(p => p.id === userJid);
            const isUserAdmin = userParticipant && (userParticipant.admin === 'admin' || userParticipant.admin === 'superadmin');
            
            if (!isUserAdmin) {
                await sendWarningReact();
                return await sendReply("❌ Apenas administradores podem usar este comando!");
            }

            // Verifica se o bot é admin
            const botJid = socket.user?.id?.split(':')[0] + '@s.whatsapp.net';
            const botParticipant = participants.find(p => p.id === botJid);
            const isBotAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');
            
            if (!isBotAdmin) {
                await sendWarningReact();
                await executeListOnly(remoteJid, args, sendReply, getGroupParticipants);
                return;
            }

            await sendSuccessReact();

            // Pega o número mínimo de mensagens (padrão: 0)
            const minMessages = parseInt(args[0]) || 0;
            
            if (minMessages < 0) {
                await sendWarningReact();
                return await sendReply("❌ O número deve ser maior ou igual a 0!");
            }

            // Carrega o activityTracker (mesma estrutura do rank-inativo)
            const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);
            
            // Obtém estatísticas do grupo atual
            const groupStats = activityTracker.getGroupStats(remoteJid);

            // Filtrar membros fantasmas - ignorando administradores e owner
            const ghostMembers = [];
            
            for (const participant of participants) {
                const userId = participant.id;
                const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
                
                // Ignorar administradores, owner e bot
                if (isAdmin) continue;
                if (OWNER_NUMBER && userId.includes(OWNER_NUMBER)) continue;
                if (userId === botJid) continue;
                
                // Verificar atividade do usuário
                const userData = groupStats[userId];
                const messages = userData ? (userData.messages || 0) : 0;
                const stickers = userData ? (userData.stickers || 0) : 0;
                const total = messages + stickers;
                
                // Adicionar se atender ao critério
                if (total <= minMessages) {
                    // Usa a mesma função do rank-inativo para pegar o nome
                    const displayName = activityTracker.getDisplayName(remoteJid, userId);
                    
                    ghostMembers.push({
                        userId,
                        jid: userId,
                        name: displayName,
                        messageCount: messages,
                        stickerCount: stickers,
                        total: total
                    });
                }
            }

            if (ghostMembers.length === 0) {
                return await sendReply(`
╭─「 🎉 GRUPO ATIVO 🎉 」
│
├ ✅ Parabéns!
├ 👥 Não há membros com ${minMessages} mensagem(s) ou menos
├ 🏆 Todos estão participando ativamente
├ 💪 Continue incentivando a participação!
│
╰─「 DeadBoT 」`);
            }

            // Gera ID de confirmação único
            const confirmationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Construir lista de fantasmas
            let listMessage = `
╭─「 👻 MEMBROS FANTASMAS 👻 」
│
├ 📊 Critério: ${minMessages} mensagem(s) ou menos
├ 👥 Encontrados: ${ghostMembers.length} membros
│`;

            // Array para menções
            const mentions = [];
            
            // Limitar exibição a 15 membros
            const displayLimit = 15;
            const membersToShow = ghostMembers.slice(0, displayLimit);

            membersToShow.forEach((member, index) => {
                const userMention = `@${member.userId.split('@')[0]}`;
                mentions.push(member.userId);
                
                // Formato: msgs + figs se tiver figurinhas, senão só msgs
                let countText;
                if (member.stickerCount > 0) {
                    countText = `${member.messageCount} msgs + ${member.stickerCount} figs`;
                } else {
                    countText = `${member.messageCount} msgs`;
                }
                
                listMessage += `
├ ${index + 1}. ${userMention} (${countText})`;
            });

            if (ghostMembers.length > displayLimit) {
                listMessage += `
├ ... e mais ${ghostMembers.length - displayLimit} membros`;
            }

            listMessage += `
│
├ ⚠️ Para continuar, digite: SIM
├ ⚠️ Para cancelar, digite: NÃO
├ ⏰ Você tem 1 minuto para responder...
│
╰─「 DeadBoT 」`;

            // Enviar com menções
            await sendReply(listMessage, mentions);

            // Armazena dados para confirmação (expira em 1 minuto)
            pendingBans.set(confirmationId, {
                chatId: remoteJid,
                adminJid: userJid,
                ghostMembers: ghostMembers,
                minMessages,
                timestamp: Date.now(),
                expiresAt: Date.now() + 60000 // 1 minuto
            });

        } catch (error) {
            console.error("Erro no comando banghost:", error);
            await sendErrorReact();
            await sendReply("❌ Ocorreu um erro ao buscar os membros fantasmas. Tente novamente mais tarde.");
        }
    }
};

/**
 * Executa apenas listagem quando bot não é admin
 */
async function executeListOnly(remoteJid, args, sendReply, getGroupParticipants) {
    try {
        const minMessages = parseInt(args[0]) || 0;
        
        // Carrega o activityTracker
        const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);
        
        // Pega os participantes do grupo
        const participants = await getGroupParticipants();
        
        // Obtém estatísticas do grupo atual
        const groupStats = activityTracker.getGroupStats(remoteJid);

        // Filtrar membros fantasmas - ignorando administradores
        const ghostMembers = [];
        
        for (const participant of participants) {
            const userId = participant.id;
            const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
            
            // Ignorar administradores
            if (isAdmin) continue;
            if (OWNER_NUMBER && userId.includes(OWNER_NUMBER)) continue;
            
            // Verificar atividade do usuário
            const userData = groupStats[userId];
            const messages = userData ? (userData.messages || 0) : 0;
            const stickers = userData ? (userData.stickers || 0) : 0;
            const total = messages + stickers;
            
            // Adicionar se atender ao critério
            if (total <= minMessages) {
                const displayName = activityTracker.getDisplayName(remoteJid, userId);
                
                ghostMembers.push({
                    userId,
                    name: displayName,
                    messageCount: messages,
                    stickerCount: stickers,
                    total: total
                });
            }
        }

        if (ghostMembers.length === 0) {
            return await sendReply(`
╭─「 🎉 GRUPO ATIVO 🎉 」
│
├ ✅ Parabéns!
├ 👥 Não há membros com ${minMessages} mensagem(s) ou menos
├ 🏆 Todos estão participando ativamente
│
╰─「 DeadBoT 」`);
        }

        // Construir lista (modo apenas visualização)
        let listMessage = `
╭─「 👻 FANTASMAS (LISTAGEM) 👻 」
│
├ 📊 Critério: ${minMessages} mensagem(s) ou menos
├ 👥 Encontrados: ${ghostMembers.length} membros
├ ⚠️ Bot não é admin - Apenas listando
│`;

        // Array para menções
        const mentions = [];
        
        // Limitar exibição a 10 membros no modo listagem
        const displayLimit = 10;
        const membersToShow = ghostMembers.slice(0, displayLimit);

        membersToShow.forEach((member, index) => {
            const userMention = `@${member.userId.split('@')[0]}`;
            mentions.push(member.userId);
            
            // Formato: msgs + figs se tiver figurinhas, senão só msgs
            let countText;
            if (member.stickerCount > 0) {
                countText = `${member.messageCount} msgs + ${member.stickerCount} figs`;
            } else {
                countText = `${member.messageCount} msgs`;
            }
            
            listMessage += `
├ ${index + 1}. ${userMention} (${countText})`;
        });

        if (ghostMembers.length > displayLimit) {
            listMessage += `
├ ... e mais ${ghostMembers.length - displayLimit} membros`;
        }

        listMessage += `
│
├ 💡 Para banir: Torne o bot administrador
├ 🔄 E use o comando novamente
│
╰─「 DeadBoT 」`;

        // Enviar com menções
        await sendReply(listMessage, mentions);
        
    } catch (error) {
        console.error('Erro no modo listagem do banghost:', error);
        await sendReply('❌ Erro ao listar membros fantasmas!');
    }
}

// Limpa confirmações antigas a cada minuto
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of pendingBans.entries()) {
        if (now - data.timestamp > 60000) { // 1 minuto
            pendingBans.delete(id);
        }
    }
}, 60000);