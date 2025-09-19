/**
 * Comando Anti-Mídia para DeadBoT
 * 
 * Este comando ativa/desativa a proteção contra mídia no grupo.
 * Quando ativo, apenas permite imagens, vídeos e GIFs em visualização única.
 * Qualquer mídia normal será deletada automaticamente.
 * 
 * Pasta: admin (apenas administradores podem usar)
 * 
 * @author Seu Nome
 */
const { PREFIX } = require("../../config");

// Armazenar grupos com anti-mídia ativo (em produção, usar banco de dados)
const antiMediaGroups = new Set();

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
                "🔒 A partir de agora:\n" +
                "• Imagens, vídeos e GIFs normais serão deletados\n" +
                "• Apenas mídia em *visualização única* é permitida\n" +
                "• Membros serão avisados quando violarem a regra"
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
        isBotGroupAdmins 
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
                // Deleta a mensagem
                await deleteMessage();
                
                // Avisa o usuário
                await sendText(
                    "⚠️ *Mídia não permitida!*\n" +
                    "Mande somente em *visualização única*"
                );
                
            } catch (error) {
                console.error("❌ [ANTI-MÍDIA] Erro ao deletar mídia:", error);
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