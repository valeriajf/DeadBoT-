/**
 * Comando para monitorar e controlar o Rate Limit do bot
 * 
 * 
 * @author VaL
 */
const { PREFIX } = require("../../config");
const rateLimitController = require("../../utils/rateLimitController");

module.exports = {
    name: "rate-limit",
    description: "Monitora e controla o sistema de rate limit do bot",
    commands: ["rate-limit", "ratelimit", "rl"],
    usage: `${PREFIX}rate-limit [status/reset]`,
    
    /**
     * @param {CommandHandleProps} props
     * @returns {Promise<void>}
     */
    handle: async ({ 
        sendText, 
        args, 
        remoteJid,
        chatId
    }) => {
        const groupId = remoteJid || chatId;
        
        // Verifica se é grupo
        if (!groupId || !groupId.endsWith('@g.us')) {
            return await sendText("❌ Este comando só funciona em grupos!");
        }

        // TEMPORÁRIO: Removendo verificação de admin para funcionar
        // TODO: Adicionar verificação depois que resolver o problema das variáveis

        const action = args[0]?.toLowerCase();
        
        // Sem argumentos ou "status" - mostra status
        if (!action || action === 'status') {
            const statusMessage = rateLimitController.getStatusMessage();
            return await sendText(statusMessage);
        }
        
        // Reset manual (apenas para emergências)
        if (action === 'reset') {
            rateLimitController.forceReset();
            return await sendText(
                "🔄 *Rate Limit Resetado*\n\n" +
                "✅ Sistema resetado manualmente\n" +
                "⚠️ Use apenas em emergências!"
            );
        }
        
        // Ajuda
        return await sendText(
            `📋 *Comando Rate Limit*\n\n` +
            `*Uso:*\n` +
            `${PREFIX}rate-limit status - Ver status atual\n` +
            `${PREFIX}rate-limit reset - Resetar sistema (emergência)\n\n` +
            `*O que é Rate Limit?*\n` +
            `Sistema que controla a velocidade das operações do bot para evitar bloqueios do WhatsApp.`
        );
    }
};