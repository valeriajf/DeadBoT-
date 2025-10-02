/**
 * Comando Anti-Mídia para DeadBoT
 * 
 * Este comando ativa/desativa a proteção contra mídia no grupo.
 * Quando ativo, apenas permite imagens, vídeos e GIFs em visualização única.
 * Qualquer mídia normal será deletada automaticamente.
 * 
 * @author Dev VaL 
 */
const { PREFIX } = require("../../config");

// Armazenar grupos com anti-mídia ativo (em produção, usar banco de dados)
const antiMediaGroups = new Set();

// Sistema de controle de rate limit com delay obrigatório
const rateLimitControl = new Map();

// Função para verificar e controlar rate limit com delay
async function checkRateLimitWithDelay(groupId) {
    const now = Date.now();
    const groupData = rateLimitControl.get(groupId) || { lastAction: 0 };
    
    // Força um delay mínimo de 5 segundos entre ações no mesmo grupo
    const timeSinceLastAction = now - groupData.lastAction;
    if (timeSinceLastAction < 5000) {
        const waitTime = 5000 - timeSinceLastAction;
        console.log(`⏳ [ANTI-MÍDIA] Aguardando ${waitTime}ms para evitar rate limit...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    groupData.lastAction = Date.now();
    rateLimitControl.set(groupId, groupData);
    return true;
}

module.exports = {
    name: "anti-midia",
    description: "Ativa/desativa proteção contra mídia normal no grupo (só permite visualização única)",
    commands: ["anti-midia", "antimimidia", "antimidia"],
    usage: `${PREFIX}anti-midia (1/0)`,
    
    /**
     * @param {CommandHandleProps} props
     * @returns {Promise<void>}
     */
    handle: async ({ 
        sendText, 
        args, 
        remoteJid,
        chatId,
        sender
    }) => {
        const groupId = remoteJid || chatId;
        
        // Verifica se é grupo
        if (!groupId || !groupId.endsWith('@g.us')) {
            return await sendText("❌ Este comando só funciona em grupos!");
        }

        // TEMPORÁRIO: Removendo verificações de admin para teste
        // TODO: Ajustar verificações depois

        const action = args[0];
        
        if (!action || !['1', '0'].includes(action)) {
            const status = antiMediaGroups.has(groupId) ? "🟢 Ativo" : "🔴 Inativo";
            return await sendText(
                `📋 *Anti-Mídia Status:* ${status}\n\n` +
                `*Uso:* ${PREFIX}anti-midia (1/0)\n` +
                `*1* = Ativar | *0* = Desativar\n` +
                `*Função:* Permite apenas mídias em visualização única`
            );
        }

        if (action === '1') {
            if (antiMediaGroups.has(groupId)) {
                return await sendText("⚠️ Anti-mídia já está ativo neste grupo!");
            }
            
            antiMediaGroups.add(groupId);
            await sendText(
                "✅ *Anti-mídia ativado!*\n\n" +
                "• Imagens, vídeos e GIFs serão deletados\n" +
                "• Apenas mídia em *visualização única* será permitida"
            );
            
        } else if (action === '0') {
            if (!antiMediaGroups.has(groupId)) {
                return await sendText("⚠️ Anti-mídia já está desativo neste grupo!");
            }
            
            antiMediaGroups.delete(groupId);
            await sendText(
                "✅ *Anti-mídia desativado!*\n\n" +
                "🔓 Agora todos os tipos de mídia são permitidos novamente."
            );
        }
    },

    // Função para verificar mídia (será chamada no onMessagesUpsert)
    checkMedia: async ({ 
        message, 
        from, 
        isGroupMsg, 
        deleteMessage, 
        sendText, 
        sender,
        isBotGroupAdmins,
        webMessage // Adicionamos o webMessage para poder marcar
    }) => {
        // Só funciona em grupos com anti-mídia ativo e bot admin
        if (!isGroupMsg || !antiMediaGroups.has(from) || !isBotGroupAdmins) {
            return;
        }

        const { type, isViewOnce } = message;
        
        // Verifica se é mídia (EXCLUINDO stickers/figurinhas)
        const isMedia = [
            'imageMessage', 
            'videoMessage'
            // 'stickerMessage' removido - figurinhas são sempre permitidas
        ].includes(type);

        // Se é mídia mas NÃO é visualização única, deletar
        if (isMedia && !isViewOnce) {
            try {
                // Deleta PRIMEIRO para evitar rate limit
                await deleteMessage();
                
                // DEPOIS envia o aviso (sem marcar para evitar problemas)
                await sendText("⚠️ *Mídia não permitida!*\nMande somente em *visualização única*");
                
            } catch (error) {
                // Se for erro de rate limit, só loga sem tentar novamente
                if (error.message?.includes('rate-overlimit')) {
                    console.error("⚠️ [ANTI-MÍDIA] Rate limit atingido, operação ignorada");
                } else {
                    console.error("❌ [ANTI-MÍDIA] Erro ao deletar mídia:", error);
                }
            }
        }
    },

    // Getter para verificar se grupo tem anti-mídia ativo
    isAntiMediaActive: (groupId) => {
        return antiMediaGroups.has(groupId);
    },

    // Para limpar grupos inativos (opcional)
    clearInactiveGroups: () => {
        antiMediaGroups.clear();
    }
};