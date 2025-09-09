/**
 * Comando unmuteall - Desmuta todos os membros do grupo
 * Remove as restrições do muteall, permitindo todos os tipos de mensagem
 * Só pode ser desativado por administradores
 *
 * @author DeadBoT
 */
const { PREFIX } = require("../../config");
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração de muteall
const MUTEALL_CONFIG_PATH = path.join(__dirname, '..', '..', 'database', 'muteall.json');

// Função para carregar configurações do muteall
function loadMuteallConfig() {
    try {
        if (!fs.existsSync(MUTEALL_CONFIG_PATH)) {
            return {};
        }
        const data = fs.readFileSync(MUTEALL_CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ [UNMUTEALL] Erro ao carregar configurações:', error.message);
        return {};
    }
}

// Função para salvar configurações do muteall
function saveMuteallConfig(config) {
    try {
        const dir = path.dirname(MUTEALL_CONFIG_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(MUTEALL_CONFIG_PATH, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('❌ [UNMUTEALL] Erro ao salvar configurações:', error.message);
        return false;
    }
}

// Função para verificar se o grupo está em muteall
function isGroupMutedAll(groupId) {
    const config = loadMuteallConfig();
    return config[groupId] === true;
}

// Função para desativar muteall em um grupo
function disableMuteall(groupId) {
    const config = loadMuteallConfig();
    if (config[groupId]) {
        delete config[groupId];
        return saveMuteallConfig(config);
    }
    return false;
}

module.exports = {
    name: "unmuteall",
    description: "Remove o muteall do grupo, permitindo novamente todos os tipos de mensagem",
    commands: ["unmuteall", "desmutartodos"],
    usage: `${PREFIX}unmuteall`,
    
    /**
     * @param {CommandHandleProps} props
     * @returns {Promise<void>}
     */
    handle: async ({ 
        sendSuccessReply,
        sendErrorReply,
        sendWarningReply,
        isAdmin,
        remoteJid,
        userJid,
        socket
    }) => {
        try {
            // Verifica se é um grupo
            if (!remoteJid.endsWith('@g.us')) {
                return await sendErrorReply('❌ Este comando só funciona em grupos!');
            }

            // Verifica se o usuário é admin (verificação manual se isAdmin não estiver funcionando)
            let userIsAdmin = isAdmin;
            if (!userIsAdmin) {
                try {
                    const groupMetadata = await socket.groupMetadata(remoteJid);
                    const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
                    userIsAdmin = groupAdmins.includes(userJid);
                } catch (error) {
                    console.error('❌ [UNMUTEALL] Erro ao verificar admin:', error.message);
                }
            }

            if (!userIsAdmin) {
                return await sendErrorReply('❌ Apenas administradores podem usar este comando!');
            }

            // Verifica se o grupo está em muteall
            if (!isGroupMutedAll(remoteJid)) {
                return await sendWarningReply('⚠️ Este grupo não está com o muteall ativado!');
            }

            // Desativa o muteall
            if (disableMuteall(remoteJid)) {
                const message = `🔊 MUTEALL DESATIVADO 🔊

📢 Liberdade restaurada:

🎉 Todos podem conversar normalmente novamente!`;

                await sendSuccessReply(message);
                console.log(`🔊 [UNMUTEALL] Desativado no grupo: ${remoteJid}`);
            } else {
                await sendErrorReply('❌ Erro ao desativar o muteall. Tente novamente.');
            }

        } catch (error) {
            console.error('❌ [UNMUTEALL] Erro no comando:', error.message);
            await sendErrorReply('❌ Erro interno ao executar o comando.');
        }
    },

    // Exporta funções auxiliares
    isGroupMutedAll,
    disableMuteall,
    loadMuteallConfig,
    saveMuteallConfig
};