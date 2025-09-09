/**
 * Comando BanGhost - Lista e bane membros fantasmas (inativos)
 * 
 * @author VaL (DeadBoT)
 */
const { PREFIX } = require(`${BASE_DIR}/config`);
const { OWNER_NUMBER } = require(`${BASE_DIR}/config`);

// Sistema de rastreamento de atividade
const activityTracker = require(`${BASE_DIR}/utils/activityTracker`);

// Armazenamento temporário para confirmações de banimento
const pendingBans = new Map();

module.exports = {
    name: "banghost",
    description: "Lista e pode banir membros com poucas mensagens no grupo",
    commands: ["banghost", "banfantasma"],
    usage: `${PREFIX}banghost [número]`,
    
    // Expõe o Map para ser acessado pelo onMessagesUpsert
    getPendingBans: () => pendingBans,
    
    /**
     * @param {CommandHandleProps} props
     * @returns {Promise<void>}
     */
    handle: async ({
        sendReply,
        sendReact,
        socket,
        webMessage,
        args,
        prefix
    }) => {
        try {
            // Extrair dados diretamente do webMessage
            const chatId = webMessage.key.remoteJid;
            const userJid = webMessage.key.participant || webMessage.key.remoteJid;
            
            // Verificar qual subcomando foi usado
            const text = webMessage.message?.conversation || webMessage.message?.extendedTextMessage?.text || "";
            const textUpper = text.trim().toUpperCase();
            
            // Verificar se é resposta SIM/NÃO para alguma confirmação pendente
            if (textUpper === 'SIM' || textUpper === 'NÃO' || textUpper === 'NAO') {
                // Esta lógica agora é tratada pelo onMessagesUpsert
                return;
            }
            
            const [command, ...cmdArgs] = text.trim().slice(1).split(/\s+/);
            
            // Se for comando de confirmação (não usado mais)
            if (command.toLowerCase() === 'banghost-confirm') {
                return await sendReply("❌ Use apenas SIM ou NÃO para confirmar!");
            }
            
            // Se for comando de cancelamento (não usado mais)  
            if (command.toLowerCase() === 'banghost-cancel') {
                return await sendReply("❌ Use apenas SIM ou NÃO para cancelar!");
            }
            
            // Verifica se é um grupo
            const isGroupMsg = chatId && chatId.endsWith('@g.us');
            if (!isGroupMsg) {
                return await sendReply("❌ Este comando só funciona em grupos!");
            }
            
            // Verifica se o usuário é admin
            try {
                const groupMetadata = await socket.groupMetadata(chatId);
                const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
                const isGroupAdmins = groupAdmins.includes(userJid);
                
                if (!isGroupAdmins) {
                    return await sendReply("❌ Apenas administradores podem usar este comando!");
                }

                // Verifica se o bot é admin
                const botJid = socket.user?.id?.replace(':0', '@s.whatsapp.net');
                const botJidAlt = socket.user?.id;
                const botJidClean = socket.user?.id?.split(':')[0] + '@s.whatsapp.net';
                
                const isBotGroupAdmins = groupAdmins.includes(botJid) || 
                                       groupAdmins.includes(botJidAlt) || 
                                       groupAdmins.includes(botJidClean);
                
                if (!isBotGroupAdmins) {
                    // Modo apenas listagem (sem banimento)
                    await executeListOnly(chatId, socket, args, sendReply, sendReact, groupMetadata, userJid);
                    return;
                }
                
                // Pega o número mínimo de mensagens (padrão: 0)
                const minMessages = parseInt(args[0]) || 0;
                
                if (minMessages < 0) {
                    return await sendReply("❌ O número deve ser maior ou igual a 0!");
                }

                // Reage para mostrar que está processando
                await sendReact("⏳");

                // Obtém dados do grupo
                const members = groupMetadata.participants;
                
                // Obtém dados de atividade do grupo
                let activityData = { users: {} };
                try {
                    // Tenta diferentes métodos de acessar o activityTracker
                    if (activityTracker && typeof activityTracker.getGroupActivity === 'function') {
                        activityData = activityTracker.getGroupActivity(chatId);
                    } else if (activityTracker && typeof activityTracker.getActivity === 'function') {
                        activityData = activityTracker.getActivity(chatId);
                    } else if (activityTracker && activityTracker[chatId]) {
                        activityData = activityTracker[chatId];
                    }
                } catch (actError) {
                    // Usando dados vazios - todos serão considerados fantasmas
                }
                
                // Filtra membros fantasmas
                const ghostMembers = [];
                
                for (const member of members) {
                    // Pula administradores, owner e o próprio bot
                    if (member.admin || member.id === botJidClean) continue;
                    if (OWNER_NUMBER && member.id.includes(OWNER_NUMBER)) continue;
                    
                    // Obtém dados de atividade do membro
                    const userActivity = activityData.users && activityData.users[member.id] ? activityData.users[member.id] : null;
                    const messageCount = userActivity ? userActivity.messages : 0;
                    
                    if (messageCount <= minMessages) {
                        // Obtém nome do usuário
                        const userName = userActivity?.name || 
                                       member.notify || 
                                       member.id.split('@')[0];
                        
                        ghostMembers.push({
                            jid: member.id,
                            name: userName,
                            messageCount: messageCount,
                            lastActivity: userActivity?.lastActivity || "Nunca"
                        });
                    }
                }

                if (ghostMembers.length === 0) {
                    await sendReact("✅");
                    return await sendReply(`✅ Não há membros com ${minMessages} mensagem(s) ou menos no grupo!`);
                }

                // Gera ID de confirmação único
                const confirmationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Monta a lista
                let listText = `👻 **MEMBROS FANTASMAS**\n`;
                listText += `📊 Critério: ${minMessages} mensagem(s) ou menos\n`;
                listText += `👥 Encontrados: ${ghostMembers.length} membros\n\n`;
                
                // Lista os membros (máximo 20 para não sobrecarregar)
                const displayLimit = 20;
                const membersToShow = ghostMembers.slice(0, displayLimit);
                
                membersToShow.forEach((member, index) => {
                    const lastActivityText = member.lastActivity === "Nunca" ? "Nunca" : 
                        new Date(member.lastActivity).toLocaleDateString('pt-BR');
                        
                    listText += `${index + 1}. @${member.jid.split('@')[0]} (${member.messageCount} msgs)\n`;
                    listText += `   └ Última atividade: ${lastActivityText}\n`;
                });
                
                if (ghostMembers.length > displayLimit) {
                    listText += `\n... e mais ${ghostMembers.length - displayLimit} membros\n`;
                }
                
                listText += `\n⚠️ **Para continuar, digite: SIM**`;
                listText += `\n⚠️ **Para cancelar, digite: NÃO**`;
                listText += `\n⏰ Você tem 1 minuto para responder...`;

                // Envia a lista mencionando os usuários (apenas os primeiros 5 para não spam)
                const mentions = membersToShow.slice(0, 5).map(member => member.jid);
                
                await socket.sendMessage(chatId, {
                    text: listText,
                    mentions: mentions
                });

                // Armazena dados para confirmação (expira em 1 minuto)
                pendingBans.set(confirmationId, {
                    chatId,
                    adminJid: userJid,
                    ghostMembers,
                    minMessages,
                    timestamp: Date.now(),
                    expiresAt: Date.now() + 60000 // 1 minuto
                });

                // Reage com sucesso
                await sendReact("✅");
                
            } catch (metadataError) {
                return await sendReply("❌ Erro ao verificar permissões do grupo!");
            }

        } catch (error) {
            await sendReact("❌");
            await sendReply('❌ Ocorreu um erro ao executar o comando!');
        }
    }
};

/**
 * Executa apenas listagem quando bot não é admin
 */
async function executeListOnly(chatId, socket, args, sendReply, sendReact, groupMetadata, userJid) {
    try {
        await sendReact("⏳");
        
        const minMessages = parseInt(args[0]) || 0;
        const members = groupMetadata.participants;
        const botJidClean = socket.user?.id?.split(':')[0] + '@s.whatsapp.net';
        
        // Obtém dados de atividade do grupo
        let activityData = { users: {} };
        try {
            // Tenta diferentes métodos de acessar o activityTracker
            if (activityTracker && typeof activityTracker.getGroupActivity === 'function') {
                activityData = activityTracker.getGroupActivity(chatId);
            } else if (activityTracker && typeof activityTracker.getActivity === 'function') {
                activityData = activityTracker.getActivity(chatId);
            } else if (activityTracker && activityTracker[chatId]) {
                activityData = activityTracker[chatId];
            }
        } catch (actError) {
            // Usando dados vazios - todos serão considerados fantasmas
        }
        
        // Filtra membros fantasmas
        const ghostMembers = [];
        
        for (const member of members) {
            // Pula administradores, owner e o próprio bot
            if (member.admin || member.id === botJidClean) continue;
            if (OWNER_NUMBER && member.id.includes(OWNER_NUMBER)) continue;
            
            // Obtém dados de atividade do membro
            const userActivity = activityData.users && activityData.users[member.id] ? activityData.users[member.id] : null;
            const messageCount = userActivity ? userActivity.messages : 0;
            
            if (messageCount <= minMessages) {
                const userName = userActivity?.name || 
                               member.notify || 
                               member.id.split('@')[0];
                
                ghostMembers.push({
                    jid: member.id,
                    name: userName,
                    messageCount: messageCount,
                    lastActivity: userActivity?.lastActivity || "Nunca"
                });
            }
        }

        if (ghostMembers.length === 0) {
            await sendReact("✅");
            return await sendReply(`✅ Não há membros com ${minMessages} mensagem(s) ou menos no grupo!`);
        }

        // Monta a lista (modo apenas visualização)
        let listText = `👻 **MEMBROS FANTASMAS** (Modo Listagem)\n`;
        listText += `📊 Critério: ${minMessages} mensagem(s) ou menos\n`;
        listText += `👥 Encontrados: ${ghostMembers.length} membros\n`;
        listText += `⚠️ Bot não é admin - Apenas listando\n\n`;
        
        const displayLimit = 15;
        const membersToShow = ghostMembers.slice(0, displayLimit);
        
        membersToShow.forEach((member, index) => {
            const lastActivityText = member.lastActivity === "Nunca" ? "Nunca" : 
                new Date(member.lastActivity).toLocaleDateString('pt-BR');
                
            listText += `${index + 1}. @${member.jid.split('@')[0]} (${member.messageCount} msgs)\n`;
            listText += `   └ Última atividade: ${lastActivityText}\n`;
        });
        
        if (ghostMembers.length > displayLimit) {
            listText += `\n... e mais ${ghostMembers.length - displayLimit} membros`;
        }
        
        listText += `\n\n💡 **Para banir:** Torne o bot administrador e use novamente`;

        const mentions = membersToShow.slice(0, 5).map(member => member.jid);
        
        await socket.sendMessage(chatId, {
            text: listText,
            mentions: mentions
        });

        await sendReact("✅");
        
    } catch (error) {
        await sendReact("❌");
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